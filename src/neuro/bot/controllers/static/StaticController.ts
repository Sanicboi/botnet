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
