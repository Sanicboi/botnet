import TelegramBot, { Message } from "node-telegram-bot-api";
//@ts-ignore
import docx from "html-to-docx";

export class OutputBotFormatter {
  constructor(private bot: TelegramBot) {}

  public async respondOpenai(
    to: number,
    result: string,
    format: "text" | "html-file" | "word-file",
  ) {
    switch (format) {
      case "text":
        await this.bot.sendMessage(to, result, {
          parse_mode: "Markdown",
        });
        break;
      case "html-file":
        const b = Buffer.from(
          result.replaceAll("```html", "").replaceAll("`", ""),
          "utf-8",
        );
        await this.bot.sendDocument(
          to,
          b,
          {
            caption: "Ваш ответ готов. Если нужно что-то еще - пишите.",
          },
          {
            contentType: "text/html",
            filename: "report.html",
          },
        );
        break;
      case "word-file":
        const doc: Buffer = await docx(
          result.replaceAll("```html", "").replaceAll("`", ""),
          null,
          {
            table: {
              row: {
                cantSplit: true,
              },
            },
          },
        );
        await this.bot.sendDocument(
          to,
          doc,
          {
            caption: "Ваш ответ готов. Если нужно что-то еще - пишите.",
          },
          {
            contentType:
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            filename: "report.docx",
          },
        );
    }
  }
}
