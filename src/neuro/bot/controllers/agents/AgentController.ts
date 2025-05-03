import { AppDataSource } from "../../../../data-source";
import { AgentModel } from "../../../../entity/assistants/AgentModel";
import { Conversation } from "../../../../entity/Conversation";
import { User } from "../../../../entity/User";
import { Bot } from "../../../Bot";
import { Btn } from "../../../utils";
import { IController } from "../../Controller";
import { ConversationController } from "./conversations/ConversationController";
import { ModelController } from "./ModelController";
import { CopyWriterController } from "./special/CopyWriterController";
import { OfferCreatorController } from "./special/OfferCreatorController";
import { PostCreatorController } from "./special/PostCreatorController";

const manager = AppDataSource.manager;

/**
 * Объединяет вообще все, связанное с агентами
 * Привязывает все в этой папке
 * Делегирует задачи другим контроллерам
 */
export class AgentController implements IController {
  private copyWriterController: CopyWriterController;
  private offerCreatorController: OfferCreatorController;
  private postCreatorController: PostCreatorController;
  private modelController: ModelController;
  private conversationController: ConversationController;

  constructor(private bot: Bot) {
    this.modelController = new ModelController(this.bot);
    this.conversationController = new ConversationController(this.bot);
    this.copyWriterController = new CopyWriterController(
      this.bot,
      this.modelController,
      this.conversationController,
    );
    this.postCreatorController = new PostCreatorController(
      this.bot,
      this.modelController,
      this.conversationController,
    );
    this.offerCreatorController = new OfferCreatorController(
      this.bot,
      this.modelController,
      this.conversationController,
    );
  }

  public bind() {
    this.modelController.bind();
    this.conversationController.bind();
    this.copyWriterController.bind();
    this.offerCreatorController.bind();
    this.postCreatorController.bind();
  }

  private async startConversation(user: User, agentId: number) {
    if (agentId <= 3) return; // это обработают другие контроллеры

    await this.conversationController.markAllAsInactive(user);

    const agent = await manager.findOneBy(AgentModel, {
      id: agentId,
    });
    if (!agent) return;

    user.agent = agent;
    await manager.save(user);

    const conversation = new Conversation();
    conversation.agent = user.agent;
    conversation.user = user;
    conversation.api = user.model.api;
    await manager.save(conversation);

    await this.bot.bot.sendMessage(+user.chatId, agent.firstMessage, {
      reply_markup: {
        inline_keyboard: agent.examplePrompt
          ? [Btn('Взять информацию из раздела "Обо мне"', "take-data")]
          : [],
      },
    });
    if (agent.examplePrompt) {
      await this.bot.bot.sendDocument(
        +user.chatId,
        Buffer.from(agent.examplePrompt),
        {
          caption: "Пример промпта",
        },
        {
          contentType: "text/plain",
          filename: "example.txt",
        },
      );
    }

    await this.modelController.sendSelectAPI(+user.chatId);
  }
}
