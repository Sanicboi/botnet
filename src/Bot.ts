import TelegramBot, {
  type SendMessageOptions,
  type SendPhotoOptions,
  type SendDocumentOptions,
  type SendVoiceOptions,
} from "node-telegram-bot-api";
import { TextFormat } from "./views/formats";
import { Keyboard } from "./views/keyboard";
import { EnvError } from "./errors/EnvError";
import { TelegramFile } from "./views/files";

/**
 * Я ленивая жопа. Дима, отредактируй тут пж повторы как-нибудь. Можно через паттерн стратегии, а можно просто в метод вывести (банально логичнее как будто)
 */
export class Bot {
  private _tgBot: TelegramBot;
  private static _instance?: Bot;

  private constructor() {
    if (!process.env.SMARTCOMRADE_TOKEN)
      throw new EnvError("SMARTCOMRADE_TOKEN");
    this._tgBot = new TelegramBot(process.env.SMARTCOMRADE_TOKEN, {
      polling: true,
    });
  }

  public static get s_Instance(): Bot {
    if (!this._instance) {
      this._instance = new Bot();
    }

    return this._instance;
  }

  public async sendText(
    to: number,
    text: string,
    keyboard: Keyboard | null = null,
    format: TextFormat | null = null,
  ): Promise<void> {
    const options: SendMessageOptions = {};

    if (keyboard) {
      options.reply_markup = {
        inline_keyboard: keyboard.render(),
      };
    }

    if (format) {
      options.parse_mode = format;
    }

    await this._tgBot.sendMessage(to, text, options);
  }

  public async sendPhoto(
    to: number,
    photo: TelegramFile,
    keyboard: Keyboard | null,
    format: TextFormat | null,
  ): Promise<void> {
    const options: SendPhotoOptions = {};

    if (keyboard) {
      options.reply_markup = {
        inline_keyboard: keyboard.render(),
      };
    }

    if (format) {
      options.parse_mode = format;
    }

    if (photo.caption) {
      options.caption = photo.caption;
    }

    await this._tgBot.sendPhoto(to, photo.source, options, {
      filename: photo.name,
    });
  }

  public async sendFile(
    to: number,
    file: TelegramFile,
    keyboard: Keyboard | null,
    format: TextFormat | null,
  ): Promise<void> {
    const options: SendDocumentOptions = {};

    if (keyboard) {
      options.reply_markup = {
        inline_keyboard: keyboard.render(),
      };
    }

    if (format) {
      options.parse_mode = format;
    }

    if (file.caption) {
      options.caption = file.caption;
    }

    await this._tgBot.sendPhoto(to, file.source, options, {
      filename: file.name,
    });
  }

  public async sendVoice(to: number, voice: TelegramFile): Promise<void> {
    await this._tgBot.sendVoice(
      to,
      voice.source,
      {},
      {
        filename: voice.name,
      },
    );
  }
}
