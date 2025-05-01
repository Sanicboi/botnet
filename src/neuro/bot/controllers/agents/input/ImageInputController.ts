import { User } from "../../../../../entity/User";
import { api } from "../../../../apis/API";
import { Bot } from "../../../../Bot";
import { IController } from "../../../Controller";
import { BalanceController } from "../../balance/BalanceController";
import { Converter } from "../../balance/Converter";
import { OutputController } from "../output/OutputController";

/**
 * Контроллер ввода картинкой 
 * 
 * TODO: Не все модели обладают vision-ом. Надо подумать как реализовать проверку
 */
export class ImageInputController implements IController {

  /**
   * привязка
   */
    public bind() {
      this.bot.bot.on('photo', async (msg) => {
        const user = await this.bot.getUser(msg, {
          model: true,
          agent: true,
          conversations: true
        });

        if (!msg.photo || msg.photo.length === 0) return;


        const photo = msg.photo.sort((a, b) => b.height * b.width - a.height * a.width)[0];

        const url = await this.bot.bot.getFileLink(photo.file_id);

        await this.onPhoto(user, url, msg.caption);

      })
    }
    
    /**
     * конструктор
     * @param bot Бот
     * @param balanceController контроллер баланса
     * @param outputController контроллер вывода
     */
      constructor(
        private bot: Bot,
        private balanceController: BalanceController,
        private outputController: OutputController
      ) {}
    
      /**
       * Обработка фотографий
       * @param user пользователь
       * @param url адрес фото (из ТГ)
       * @param caption подпись фото
       * @returns ничего
       */
      private async onPhoto(user: User, url: string, caption?: string) {
        const limit = await this.balanceController.getLimit(user);
        if (!limit) return;
    
        const conv = user.conversations.find((el) => el.active);
        if (!conv) return;
    
        const result = await api.run({
          api: user.model.api,
          input: url,
          model: user.model.id,
          type: "image",
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