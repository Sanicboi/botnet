import { MessageFormatter } from "../utils/MessageFormatter";
import { Bot } from "./Bot";

export class StaticController {
  constructor(private bot: Bot) {
    this.bot.onAbout(this.about.bind(this));
    this.bot.onHelp(this.help.bind(this));
    this.bot.onTerms(this.terms.bind(this));
  }

  private async about(id: number) {
    await MessageFormatter.sendTextFromFileBot(
      this.bot.bot,
      "about-neuro.txt",
      id,
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

  private async help(id: number) {
    await MessageFormatter.sendTextFromFileBot(
      this.bot.bot,
      "help-neuro.txt",
      id,
    );
  }

  private async terms(id: number) {
    await MessageFormatter.sendTextFromFileBot(this.bot.bot, "terms.txt", id, {
      parse_mode: "Markdown",
    });
  }
}
