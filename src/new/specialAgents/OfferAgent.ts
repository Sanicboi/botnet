import { AppDataSource } from "../../data-source";
import { User } from "../../entity/User";
import { Btn } from "../../neuro/utils";
import { wait } from "../../utils/wait";
import { Bot } from "../Bot";
import { DialogController } from "../DialogController";

const manager = AppDataSource.manager;

export class OfferAgent {
  constructor(
    private bot: Bot,
    private dialogController: DialogController,
  ) {
    this.bot.onOfferSizes(this.sizes.bind(this));
    this.bot.onOfferSize(this.size.bind(this));
    this.bot.onOfferModel(this.model.bind(this));
  }

  private async sizes(user: User) {
    user.agentId = 2;
    user.agent!.id = 2;
    await manager.save(user);
    await this.bot.bot.sendMessage(+user.chatId, `Выберите размер оффера`, {
      reply_markup: {
        inline_keyboard: [
          Btn(`Большой (120-150 слов)`, `offersize-большой (70-90 слов)`),
          Btn(`Средний (90-120 слов)`, `offersize-cредний (90-120 слов)`),
          Btn(`Маленький (60-90 слов)`, `offersize-маленький (60-90 слов)`),
        ],
      },
    });
  }

  private async size(user: User, size: string) {
    user.dialogueData += `Размер оффера: ${size}\n`;
    await manager.save(user);
    await this.bot.bot.sendMessage(
      +user.chatId,
      `Для создания оффера давайте определимся с моделью!\nВыбери подходящую модель по кнопке ниже 👇\nНе знаешь какую выбрать? Смотри [справку](https://docs.google.com/document/d/1785aqFyeHDYV3QjfJwpA4TC-K1UjScqRRDsQoFk7Uy8/edit)`,
      {
        reply_markup: {
          inline_keyboard: [
            Btn(`AIDA`, `offermodel-AIDA`),
            Btn(`PAS`, `offermodel-PAS`),
            Btn(`FAB`, `offermodel-FAB`),
            Btn(`4Ps`, `offermodel-4PS`),
            Btn(`Quest`, `offermodel-QUEST`),
            Btn(`ACC`, `offermodel-ACC`),
            Btn(`Смешанная`, `offermodel-смешанная`),
          ],
        },
        parse_mode: "Markdown",
      },
    );
  }

  private async model(user: User, model: string) {
    user.dialogueData += `Модель оффера: ${model}\n`;
    await manager.save(user);
    await this.bot.bot.sendMessage(
      +user.chatId,
      "Отлично, с моделью оффера определились.",
    );
    await wait(2);
    await this.dialogController.createDialog(user, 2); // TODO: SET ID FOR THE AGENT
  }
}
