import { AppDataSource } from "../../../../../data-source";
import { Conversation } from "../../../../../entity/Conversation";
import { User } from "../../../../../entity/User";
import { OutputFormat } from "../../../../../utils/OutputFormat";
import { api } from "../../../../apis/API";
import { Bot } from "../../../../Bot";
import { Btn } from "../../../../utils";
import { IController } from "../../../Controller";
import { TokenCountingController } from "../TokenCountingController";
import { HTMLOutputConverter } from "./HTMLOutputConverter";
//@ts-ignore
import docx from "html-to-docx";

const manager = AppDataSource.manager;

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
  public bind() {
    this.bot.addCQListener(async (q) => {
      if (q.data === "settings-format") {
        const user = await this.bot.getUser(q);
        await this.onFormats(user);
      }

      if (q.data?.startsWith("format-")) {
        const user = await this.bot.getUser(q);
        await this.onFormat(user, q.data.substring(7));
      }
    });
  }

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

  private async onFormats(user: User) {
    await this.bot.bot.sendMessage(+user.chatId, `Выберите формат ответа:`, {
      reply_markup: {
        inline_keyboard: [
          Btn(
            `Стандартный (текст или документ html) ${user.outputFormat === "text" ? "✅" : ""}`,
            "format-text",
          ),
          Btn(
            `HTML ${user.outputFormat === "html" ? "✅" : ""}`,
            "format-html",
          ),
          Btn(
            `Документ Word ${user.outputFormat === "docx" ? "✅" : ""}`,
            "format-docx",
          ),
          Btn(
            `Аудио ${user.outputFormat === "audio" ? "✅" : ""}`,
            "format-audio",
          ),
        ],
      },
    });
  }

  private async onFormat(user: User, format: string) {
    const f = format as OutputFormat;
    user.outputFormat = f;
    await manager.save(user);
    await this.bot.bot.sendMessage(
      +user.chatId,
      `Формат ответа изменен на ${f}`,
      {
        reply_markup: {
          inline_keyboard: [Btn("Назад", "settings")],
        },
      },
    );
  }
}
