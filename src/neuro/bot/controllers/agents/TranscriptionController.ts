import { Message } from "node-telegram-bot-api";
import { Bot } from "../../../Bot";
import { IController } from "../../Controller";
import { api } from "../../../apis/API";
import path from "path";
import { User } from "../../../../entity/User";
import { DataController } from "./DataController";
import { AppDataSource } from "../../../../data-source";
import axios, { AxiosResponse } from "axios";
import fs from "fs";
import { AudioFile } from "../../../../entity/assistants/AudioFile";
import ffmpeg from "fluent-ffmpeg";
import { Converter } from "../balance/Converter";
import { Btn } from "../../../utils";
import { Writable } from "stream";
import { v4 } from "uuid";

const manager = AppDataSource.manager;

export class TranscriptionController implements IController {
  constructor(
    private bot: Bot,
    private dataController: DataController,
  ) {}

  private transcriberMessage: string = "";
  private summarizerMessage: string = "";

  public bind() {
    this.bot.addCQListener(async (q) => {
      if (q.data === "audio" || q.data === "audiosum") {
        const user = await this.bot.getUser(q, {
          conversations: true,
          agent: true,
        });
        await this.onAudioAgent(
          user,
          q.data === "audio" ? "transcriber" : "summarizer",
        );
      }

      if (q.data?.startsWith("transcription-")) {
        if (q.data.startsWith("transcription-reject-")) {
          const user = await this.bot.getUser(q);
          await this.onRejectTranscribe(user, q.data.substring(21));
        } else {
          // transcription-confirm-
          const user = await this.bot.getUser(q);
          await this.onConfirmTranscribe(user, q.data.substring(22));
        }
      }
    });

    this.bot.bot.on("audio", async (msg) => {
      if (!msg.audio) return;
      const user = await this.bot.getUser(msg);
      await this.onCalculateCosts(user, msg.audio.file_id, msg.caption);
    });
  }

  public async getVoiceInput(msg: Message): Promise<string> {
    if (!msg.voice) throw new Error("No voice message");
    const link = await this.bot.bot.getFileLink(msg.voice.file_id);
    return await api.openai.transcribeVoice(link, path.basename(link));
  }

  private async onAudioAgent(user: User, a: string) {
    const agent: "transcriber" | "summarizer" = a as
      | "transcriber"
      | "summarizer";
    await this.dataController.resetData(user);
    user.currentAudioAgent = agent;
    await manager.save(user);

    await this.bot.bot.sendMessage(
      +user.chatId,
      agent === "summarizer" ? this.summarizerMessage : this.transcriberMessage,
    );
  }

  private async onCalculateCosts(
    user: User,
    fileId: string,
    caption: string | null = null,
  ) {
    const url = await this.bot.bot.getFileLink(fileId);

    const { data }: AxiosResponse<Buffer> = await axios.get(url, {
      responseType: "arraybuffer",
    });

    const audio = new AudioFile();
    audio.caption = caption;
    audio.extension = path.extname(url);
    audio.user = user;
    await manager.save(audio);

    const name = audio.id + audio.extension;

    await fs.promises.writeFile(path.join(process.cwd(), "audio", name), data);

    const duration = await this.getDuration(
      path.join(process.cwd(), "audio", name),
    );
    const cost = Converter.USDSMT((duration / 60) * 0.06).toFixed(2);

    await this.bot.bot.sendMessage(
      +user.chatId,
      `Транскрибация будет стоить ${cost} токенов. Хотите продолжить?`,
      {
        reply_markup: {
          inline_keyboard: [
            Btn("Да", `transcription-confirm-${audio.id}`),
            Btn("Нет", `transcription-reject-${audio.id}`),
          ],
        },
      },
    );
  }

  private async onRejectTranscribe(user: User, id: string) {
    const audio = await manager.findOneBy(AudioFile, {
      id,
      user,
    });

    if (!audio) return;
    await fs.promises.rm(
      path.join(process.cwd(), "audio", audio.id + audio.extension),
    );
    await manager.remove(audio);
    await this.bot.bot.sendMessage(user.chatId, "Транскрибация отменена");
  }
  private async onConfirmTranscribe(user: User, id: string) {
    const audio = await manager.findOneBy(AudioFile, {
      id,
      user,
    });

    if (!audio) return;

    const stats = await fs.promises.stat(
      path.join(process.cwd(), "audio", audio.id + audio.extension),
    );
    if (!stats.isFile()) return;
    let result: string = "";
    if (stats.size > 25 * 1024 * 1024) {
      const chunks = await this.splitAudio(
        path.join(process.cwd(), "audio", audio.id + audio.extension),
      );
      for (const chunk of chunks) {
        result += await api.openai.transcribeVoice(chunk, v4 + audio.extension);
      }
    } else {
      const buf = await fs.promises.readFile(
        path.join(process.cwd(), "audio", audio.id + audio.extension),
      );
      result = await api.openai.transcribeVoice(
        buf,
        audio.id + audio.extension,
      );
    }

    await fs.promises.rm(
      path.join(process.cwd(), "audio", audio.id + audio.extension),
    );
    await manager.remove(audio);

    if (user.currentAudioAgent === "summarizer") {
      const summarized = await api.openai.summarizeText(result);
      await this.bot.bot.sendMessage(+user.chatId, summarized);
    } else {
      await this.bot.bot.sendDocument(
        +user.chatId,
        Buffer.from(result),
        {
          caption: "Транскрибация окончена",
        },
        {
          contentType: "text/plain",
          filename: "transcription.txt",
        },
      );
    }
  }

  /**
   * TODO: тут надо сделать параллелизм
   * @param p путь к файлу
   * @returns буферы
   */
  private async splitAudio(p: string): Promise<Buffer[]> {
    let chunks: Buffer[] = [];
    let stream = new Writable({
      write(chunk, encoding, callback) {
        chunks.push(chunk);
      },
    });

    await new Promise((resolve, reject) => {
      stream.on("finish", resolve);
      stream.on("error", reject);
      ffmpeg(p)
        .inputOptions(["-f segment", "-segment_time 600", "-c copy"])
        .output(stream)
        .on("error", reject)
        .run();
    });

    return chunks;
  }

  private async getDuration(p: string): Promise<number> {
    return await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(p, (err, data) => {
        if (err) reject(err);
        resolve(+data.streams[0].duration!);
      });
    });
  }
}
