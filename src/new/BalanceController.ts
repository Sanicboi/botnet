import { AppDataSource } from "../data-source";
import { User } from "../entity/User";
import { SupportedModels } from "../utils/Models";
import { Bot } from "./Bot";
import { Converter } from "./Converter";


const manager = AppDataSource.manager;

/**
 * This class is made to handle the balance of the user
 */
export class BalanceController {
  constructor(private bot: Bot) {}

  /**
   * Checks the balance and sends the message if not sufficient funds are given
   * @param user User
   * @param threshold Threshold in RUB
   */
  public async checkBalance(user: User, threshold: number = 0): Promise<{
    exists: boolean;
    limit: number;
  }> {
    const sum = user.addBalance + user.leftForToday;
    if (sum <= threshold) {
      await this.bot.bot.sendMessage(+user.chatId, "❌Упс! У вас закончились токены.\nЧтобы продолжить пользоваться ботом, вам нужно оформить подписку или купить отдельный комплект токенов…");
      return {
        exists: false,
        limit: 0,
      };
    }

    return {
      exists: true,
      limit: Converter.RUBTK(sum, user.model),
    };
  }

  /**
   * Subtract the tokens
   * @param user User
   * @param resultTokens tokens to subtract
   */
  public async editBalance(user: User, resultTokens: number) {
    const inRUB = Converter.TKRUB(resultTokens, user.model);
    let toSubtract = inRUB;
    toSubtract -= Math.min(user.leftForToday, inRUB);
    user.leftForToday -= Math.min(user.leftForToday, inRUB);
    if (toSubtract > 0) user.addBalance -= toSubtract;
    await manager.save(user);
  }
}
