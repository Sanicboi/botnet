import { AppDataSource } from "../../../../../data-source";
import { AgentModel } from "../../../../../entity/assistants/AgentModel";
import { Conversation } from "../../../../../entity/Conversation";
import { User } from "../../../../../entity/User";
import { Bot } from "../../../../Bot";
import { Btn } from "../../../../utils";
import { IController } from "../../../Controller";
import { ConversationController } from "../conversations/ConversationController";
import { DataController } from "../DataController";
import { ModelController } from "../ModelController";

const manager = AppDataSource.manager;

export class OfferCreatorController implements IController {
  private readonly _id = 2;
  private readonly _firstMessage = "Выберите размер оффера";
  private readonly _secondMessage =
    "Для создания оффера давайте определимся с моделью!\nВыбери подходящую модель по кнопке ниже 👇\nНе знаешь какую выбрать? Смотри [справку](https://docs.google.com/document/d/1785aqFyeHDYV3QjfJwpA4TC-K1UjScqRRDsQoFk7Uy8/edit)";
  private readonly _thirdMessage = "Отлично, с моделью оффера определились.";
  private readonly _fourthMessage = "";

  constructor(
    private bot: Bot,
    private modelController: ModelController,
    private conversationController: ConversationController,
    private dataController: DataController,
  ) {}

  public bind() {
    this.bot.addCQListener(async (q) => {
      if (q.data === "agent-2") {
        const user = await this.bot.getUser(q, {
          conversations: true,
          agent: true,
        });
        await this.onSizes(user);
      }

      if (q.data?.startsWith("offersize-")) {
        const user = await this.bot.getUser(q);
        await this.onSize(user, q.data.substring(10));
      }

      if (q.data?.startsWith("offermodel-")) {
        const user = await this.bot.getUser(q, {
          conversations: true,
          agent: true,
        });
        await this.onModel(user, q.data.substring(11));
      }
    });
  }

  private async onSizes(user: User) {
    await this.dataController.resetData(user);
    user.agent = new AgentModel();
    user.agent.id = this._id;
    await manager.save(user);

    await this.bot.bot.sendMessage(+user.chatId, this._firstMessage, {
      reply_markup: {
        inline_keyboard: [
          Btn(`Большой (120-150 слов)`, `offersize-большой (70-90 слов)`),
          Btn(`Средний (90-120 слов)`, `offersize-cредний (90-120 слов)`),
          Btn(`Маленький (60-90 слов)`, `offersize-маленький (60-90 слов)`),
        ],
      },
    });
  }

  private async onSize(user: User, size: string) {
    user.dialogueData += `Размер оффера: ${size}\n`;
    await manager.save(user);
    await this.bot.bot.sendMessage(+user.chatId, this._secondMessage, {
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
    });
  }

  private async onModel(user: User, model: string) {
    user.dialogueData += `Модель оффера: ${model}\n`;
    await manager.save(user);

    await this.conversationController.markAllAsInactive(user);
    await this.bot.bot.sendMessage(+user.chatId, this._thirdMessage);

    const conversation = new Conversation();
    conversation.agent = user.agent!;
    conversation.api = user.model.api;
    conversation.user = user;
    await manager.save(conversation);
    await this.bot.bot.sendMessage(
      +user.chatId,
      `${user.dialogueData}\n${this._fourthMessage}`,
    );
    // я не помню, есть ли у него пример промпта
    await this.modelController.sendSelectAPI(+user.chatId);
  }
}
