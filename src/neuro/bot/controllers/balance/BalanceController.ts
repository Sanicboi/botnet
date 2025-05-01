import { AppDataSource } from "../../../../data-source";
import { User } from "../../../../entity/User";
import { Bot } from "../../../Bot";
import { IController } from "../../Controller";
import { Converter } from "./Converter";

const manager = AppDataSource.manager;


/**
 * Контроллер баланса
 * следит за балансом пользователя и занимается всем, связанным с оплатой
 */
export class BalanceController implements IController {

/**
 * конструктор
 * @param bot Бот
 */
  constructor(private bot: Bot) {}


  /**
   * Привязка
   */
  public bind() {}


  /**
   * Метод получения максимального количества токенов для генерации или отправки сообщения об их отсутствии
   * @param user Пользователь
   * @returns Лимит или false, если токенов нет
   */
  public async getLimit(user: User): Promise<number | false>{
    const sum = user.addBalance + user.leftForToday;
    if (sum <= 0) {
        await this.bot.bot.sendMessage(+user.chatId, "❌Упс! У вас закончились токены.\nЧтобы продолжить пользоваться ботом, вам нужно оформить подписку или купить отдельный комплект токенов…");
        return false;
    }

    return Converter.RUBTK(sum, user.model);
  }

  /**
   * Метод списания суммы с баланса
   * @param rubles сколько рублей списать
   * @param user пользователь
   */
  public async subtractCost(rubles: number, user: User) {
    let toSubtract = rubles;
    let min = Math.min(user.leftForToday, rubles)
    toSubtract -= min;
    user.leftForToday -= min;
    if (toSubtract > 0) user.addBalance -= toSubtract;
    await manager.save(user);
  }
}
