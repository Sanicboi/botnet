import { User } from "../../../../../entity/User";
import { api } from "../../../../apis/API";
import { Bot } from "../../../../Bot";
import { IController } from "../../../Controller";
import { BalanceController } from "../../balance/BalanceController";
import { Converter } from "../../balance/Converter";
import { OutputController } from "../output/OutputController";

/**
 * Контролирует запуск ии-агента на текстовые вводные даннеы
 */
export class TextInputController implements IController {
  /**
   * Конструктор
   * @param bot Бот
   * @param balanceController Контроллер баланса
   * @param outputController Контроллер выхода
   */
  constructor(
    private bot: Bot,
    private balanceController: BalanceController,
    private outputController: OutputController,
  ) {}

  /**
   * Привязка
   */
  public bind() {
    this.bot.addFreeTextListener(async (msg) => {
      const user = await this.bot.getUser(msg, {
        model: true,
        conversations: true,
        agent: true,
      });
      await this.onText(user, msg.text!);
    });
  }

  /**
   * Собственно запуск модели на текстовые вводные данные
   * @param user Пользователь
   * @param text Текст сообщения
   * @returns Ничего
   */
  private async onText(user: User, text: string) {
    const limit = await this.balanceController.getLimit(user);
    if (!limit) return;

    const conv = user.conversations.find((el) => el.active);
    if (!conv) return;

    const result = await api.run({
      api: user.model.api,
      input: text,
      model: user.model.id,
      type: "text",
      conversation: conv,
      user,
      store: true,
      instructions: user.agent!.prompt,
      maxTokens: limit,
    });

    await this.balanceController.subtractCost(
      Converter.TKRUB(result.tokens, user.model),
      user,
    );

    await this.outputController.sendOutput(
      result.content,
      user,
      conv,
      result.tokens,
    );
  }
}
