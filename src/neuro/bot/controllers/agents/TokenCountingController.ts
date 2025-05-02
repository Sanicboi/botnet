import { User } from "../../../../entity/User";
import { Bot } from "../../../Bot";
import { IController } from "../../Controller";
import { Converter } from "../balance/Converter";

export class TokenCountingController implements IController {
  public bind() {}

  constructor(private bot: Bot) {}

  public async sendTokenCount(user: User, numTokens: number) {
    if (user.countTokens) {
      await this.bot.bot.sendMessage(
        +user.chatId,
        `Количество токенов: ${Converter.TKSMT(numTokens, user.model)}`,
      );
    }
  }
}
