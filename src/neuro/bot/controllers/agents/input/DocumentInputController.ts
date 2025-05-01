import { User } from "../../../../../entity/User";
import { api } from "../../../../apis/API";
import { Bot } from "../../../../Bot";
import { IController } from "../../../Controller";
import { BalanceController } from "../../balance/BalanceController";
import { Converter } from "../../balance/Converter";
import { OutputController } from "../output/OutputController";


/**
 * Контроллер ввода документом
 */
export class DocumentInputController implements IController {
    
  public bind() {
    this.bot.bot.on('document', async (msg) => {
        if (!msg.document) return;
        const user = await this.bot.getUser(msg, {
            conversations: true,
            model: true,
            agent: true
        });

        const url = await this.bot.bot.getFileLink(msg.document.file_id);

        await this.onDocument(user, url, msg.caption);
    })
  }

  /**
   * Конструктор
   * @param bot Бот
   * @param balanceController Контроллер баланса
   * @param outputController Котроллер вывода
   */
  constructor(
    private bot: Bot,
    private balanceController: BalanceController,
    private outputController: OutputController
  ) {}


  /**
   * Обработка ввода документом
   * @param user Пользователь
   * @param url Адрес файла (от ТГ)
   * @param caption Текст, отправленный с файлом (если есть)
   * @returns Ничего
   */
  private async onDocument(user: User, url: string, caption?: string) {
    const limit = await this.balanceController.getLimit(user);
    if (!limit) return;

    const conv = user.conversations.find((el) => el.active);
    if (!conv) return;

    const result = await api.run({
      api: user.model.api,
      input: url,
      model: user.model.id,
      type: "document",
      conversation: conv,
      user,
      store: true,
      instructions: user.agent!.prompt,
      maxTokens: limit,
      caption,
    });

    await this.balanceController.subtractCost(
      Converter.TKRUB(result.tokens, user.model),
      user
    );

    await this.outputController.sendOutput(result.content, user, conv);
  }
}
