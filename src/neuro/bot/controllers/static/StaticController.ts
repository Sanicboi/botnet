import { MessageFormatter } from "../../../../utils/MessageFormatter";
import { Bot } from "../../../Bot";
import { Btn } from "../../../utils";
import { IController } from "../../Controller";

export class StaticController implements IController {
  public bind() {
    this.bot.bot.onText(
      /\/about/,
      async (msg) => await this.onAbout(msg.from!.id),
    );
    this.bot.bot.onText(
      /\/terms/,
      async (msg) => await this.onTerms(msg.from!.id),
    );
    this.bot.bot.onText(
      /\/help/,
      async (msg) => await this.onHelp(msg.from!.id),
    );
    this.bot.bot.onText(
      /\/settings/,
      async (msg) => await this.onSettings(msg.from!.id),
    );
    this.bot.addCQListener(async (q) => await this.onSettings(q.from.id));
  }

  constructor(private bot: Bot) {}

  private async onSettings(userId: number) {
    await this.bot.bot.sendMessage(userId, "Настройки ⚙️", {
      reply_markup: {
        inline_keyboard: [
          Btn("Изменить модель", "settings-model"),
          Btn("Подсчет токенов", "settings-count"),
          Btn("Формат ответа", "settings-format"),
        ],
      },
    });
  }

  private async onAbout(userId: number) {
    await MessageFormatter.sendTextFromFileBot(
      this.bot.bot,
      "about-neuro.txt",
      userId,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Подробнее о компании",
                url: "https://drive.google.com/file/d/1oJcInZJShwd-LI4EYlAIBBgRWpEfMHlv/view?usp=drivesdk",
              },
            ],
            [
              {
                text: "Наш канал",
                url: "https://t.me/SmartComrade1",
              },
            ],
            [
              {
                text: "Бесплатные полезные материалы",
                url: "https://t.me/SC_NewsBot",
              },
            ],
          ],
        },
      },
    );
  }

  private async onHelp(userId: number) {
    await MessageFormatter.sendTextFromFileBot(
      this.bot.bot,
      "help-neuro.txt",
      userId,
    );
  }

  private async onTerms(userId: number) {
    await MessageFormatter.sendTextFromFileBot(
      this.bot.bot,
      "terms.txt",
      userId,
      {
        parse_mode: "Markdown",
      },
    );
  }
}
