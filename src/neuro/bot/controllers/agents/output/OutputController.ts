import { Conversation } from "../../../../../entity/Conversation";
import { User } from "../../../../../entity/User";
import { api } from "../../../../apis/API";
import { Bot } from "../../../../Bot";
import { IController } from "../../../Controller";
import { TokenCountingController } from "../TokenCountingController";
import { HTMLOutputConverter } from "./HTMLOutputConverter";
//@ts-ignore
import docx from "html-to-docx";

/**
 * Контроллер вывода
 *
 * отвечает за выбор формата вывода и за его применение к ответу ИИ
 * TODO: добавить выбор формата ответа (был уже где-то)
 * TODO: может быть весь диалог не нужен, а нужно только последнее сообщение брать?
 * TODO: это в предыдущей версии было. Нужно добавить, что, если в сообщении больше 4к слов и формат - текст, то оно автоматически конвертируется в хтмл
 */
export class OutputController implements IController {
  /**
   * Конвертер в хтмл
   */
  private htmlConverter = new HTMLOutputConverter();

  /**
   * Конструктор
   * @param bot бот
   */
  constructor(
    private bot: Bot,
    private tokenCountingController: TokenCountingController,
  ) {}

  /**
   * Привязка
   */
  public bind() {}

  /**
   * Метод конвертации и отправки результата
   * @param data Вывод модели
   * @param user Пользователь
   * @param conversation Диалог. Нужен чтобы его представить в html, в случае с подобными форматами
   * @returns ничего
   */
  public async sendOutput(
    data: string,
    user: User,
    conversation: Conversation,
    tokens: number,
  ) {
    if (user.outputFormat === "text") {
      return await this.bot.bot.sendMessage(+user.chatId, data);
    }
    if (user.outputFormat === "docx" || user.outputFormat === "html") {
      const html = await this.htmlConverter.convert(conversation, user);
      if (user.outputFormat === "html")
        return await this.bot.bot.sendDocument(
          +user.chatId,
          Buffer.from(html, "utf-8"),
          {
            caption: "Ответ сотрудника",
          },
          {
            filename: "report.html",
            contentType: "text/html; charset=utf-8",
          },
        );
      const result: Buffer = await docx(html, null, {
        table: {
          row: {
            cantSplit: true,
          },
        },
      });

      await this.bot.bot.sendDocument(
        +user.chatId,
        result,
        {
          caption: "Ответ сотрудника",
        },
        {
          contentType:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          filename: "report.docx",
        },
      );
    }

    if (user.outputFormat === "audio") {
      const res = await api.openai.createSpeech(data, "alloy");
      await this.bot.bot.sendAudio(
        +user.chatId,
        Buffer.from(res),
        {
          caption: "Ответ ассистента",
        },
        {
          contentType: "audio/mpeg",
          filename: "report.mp3",
        },
      );
    }
    await this.tokenCountingController.sendTokenCount(user, tokens);
  }
}
