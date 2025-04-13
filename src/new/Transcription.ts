import path from "path";
import fs from 'fs';
import { Readable, Writable } from "stream";
import axios, { AxiosResponse } from "axios";
import { openai } from "../neuro";
import ffmpeg from "fluent-ffmpeg";
import { User } from "../entity/User";
import { AudioFile } from "../entity/assistants/AudioFile";
import { AppDataSource } from "../data-source";



const manager = AppDataSource.manager;

/**
 * Class for transcribing audio
 */
export class Transcription {




  /**
   * COnstructor
   * @param exists Whether the file exists in the database
   * @param urlOrId File url or id in the db
   * @param prompt prompt to transcribe
   */
  constructor(private exists: boolean, private urlOrId: string, private prompt?: string) {}

  private i: number = 0;
  private result: string = "";

  /**
   * Function that is used in the stream to write data
   * @param chunk Audio chunk
   * @param encoding Encoding
   * @param callback Callback
   */
  private async write(
    chunk: Buffer,
    encoding: string,
    callback: (err?: Error) => void,
  ) {
    let f = new File([chunk], `${this.i}-${path.basename(this.urlOrId)}`);
    openai.audio.transcriptions
      .create({
        file: f,
        model: "gpt-4o-transcribe",
        prompt: this.prompt,
      })
      .then((transcription) => {
        this.result += transcription.text;
        this.i++;
        callback();
      })
      .catch(() => callback(new Error("Error transcribing")));
  }

  /**
   * Transcribe this audio, and delete it
   * @returns transcription result
   */
  public async transcribe(): Promise<string> {
    let data: Buffer;
    let inDb: AudioFile | null = null;
    if (!this.exists) {
      data = (await axios.get(this.urlOrId, {
        responseType: "arraybuffer",
      })).data;
    } else {
      inDb = await manager.findOneBy(AudioFile, {
        id: this.urlOrId
      });
      if (!inDb) throw new Error("File not found");
      this.urlOrId = inDb.id + inDb.extension;
      data = fs.readFileSync(path.join('audio', this.urlOrId));

    }

    if (data.length > 25 * 1024 * 1024) {
      const str = new Readable();
      str.push(data);
      str.push(null);
      await new Promise<void>((resolve, reject) => {
        let i = 0;
        const outputStream = new Writable({
          write: this.write.bind(this),
          final() {
            resolve();
          },
        });

        ffmpeg(str)
          .outputOptions([
            "-f segment",
            "-segment-time 600",
            "-reset_timestamps 1",
            "-map 0:a",
          ])
          .on("end", async () => {})
          .on("error", reject)
          .pipe(outputStream, {
            end: true,
          });
      });
    } else {
      const f = new File([data], path.basename(this.urlOrId));
      const transcription = await openai.audio.transcriptions.create({
        file: f,
        model: "gpt-4o-transcribe",
        prompt: this.prompt,
      });
      this.result = transcription.text;
    }

    if (inDb) {
      fs.rmSync(path.join('audio', this.urlOrId));
      await manager.remove(inDb);    
    }
    return this.result;
  }

  /**
   * Get the cost of the transcription (non-fs only)
   * @returns Cost IN USD 
   */
  public async getCost(): Promise<number> {

    const { data }: AxiosResponse<Buffer> = await axios.get(this.urlOrId, {
      responseType: "arraybuffer",
    });

    const stream = new Readable();
    stream.push(data);
    stream.push(null);
    const dur: number = await new Promise((resolve, reject) => {
      ffmpeg(stream)
      .ffprobe( async (err, data) => {
        if (err) reject(err);

        resolve(+data.streams[0].duration!)
      });   
    })

    return dur / 60 * 0.06;
  }

  /**
   * Save the audio file to the database and to the file system
   * @param user User
   * @returns 
   */
  public async save(user: User) {
    const audio = new AudioFile();
    audio.extension = path.extname(this.urlOrId);
    audio.user = user;
    audio.userId = user.chatId;
    await manager.save(audio);
    const { data }: AxiosResponse<Buffer> = await axios.get(this.urlOrId, {
      responseType: 'arraybuffer'
    });
    fs.writeFileSync(path.join('audio', audio.id + audio.extension), data)
    return audio;
  }
}
