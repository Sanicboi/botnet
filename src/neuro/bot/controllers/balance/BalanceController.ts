import { AppDataSource } from "../../../../data-source";
import { User } from "../../../../entity/User";
import { Bot } from "../../../Bot";
import { IController } from "../../Controller";
import { Converter } from "./Converter";

const manager = AppDataSource.manager;

export class BalanceController implements IController {
  constructor(private bot: Bot) {}

  public bind() {}

  public async getLimit(user: User): Promise<number | false>{
    const sum = user.addBalance + user.leftForToday;
    if (sum <= 0) {
        await this.bot.bot.sendMessage(+user.chatId, "❌Упс! У вас закончились токены.\nЧтобы продолжить пользоваться ботом, вам нужно оформить подписку или купить отдельный комплект токенов…");
        return false;
    }

    return Converter.RUBTK(sum, user.model);
  }

  public async subtractCost(rubles: number, user: User) {
    let toSubtract = rubles;
    let min = Math.min(user.leftForToday, rubles)
    toSubtract -= min;
    user.leftForToday -= min;
    if (toSubtract > 0) user.addBalance -= toSubtract;
    await manager.save(user);
  }
}
