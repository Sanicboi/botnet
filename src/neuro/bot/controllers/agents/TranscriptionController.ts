import { Message } from "node-telegram-bot-api";
import { Bot } from "../../../Bot";
import { IController } from "../../Controller";
import { api } from "../../../apis/API";
import path from "path";

export class TranscriptionController implements IController {
  constructor(private bot: Bot) {}

  public bind() {}

  public async getVoiceInput(msg: Message): Promise<string> {
    if (!msg.voice) throw new Error("No voice message");
    const link = await this.bot.bot.getFileLink(msg.voice.file_id);
    return await api.openai.transcribeVoice(link, path.basename(link));
  }
}
