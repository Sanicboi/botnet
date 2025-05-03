import { AppDataSource } from "../../../../data-source";
import { AgentModel } from "../../../../entity/assistants/AgentModel";
import { Conversation } from "../../../../entity/Conversation";
import { User } from "../../../../entity/User";
import { Bot } from "../../../Bot";
import { Btn } from "../../../utils";
import { IController } from "../../Controller";
import { BalanceController } from "../balance/BalanceController";
import { ConversationController } from "./conversations/ConversationController";
import { DataController } from "./DataController";
import { GroupController } from "./GroupController";
import { InputController } from "./InputController";
import { ModelController } from "./ModelController";
import { OutputController } from "./output/OutputController";
import { CopyWriterController } from "./special/CopyWriterController";
import { OfferCreatorController } from "./special/OfferCreatorController";
import { PostCreatorController } from "./special/PostCreatorController";
import { TokenCountingController } from "./TokenCountingController";

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
  private balanceController: BalanceController;
  private tokenCountingController: TokenCountingController;
  private outputController: OutputController;
  private groupController: GroupController;
  private inputController: InputController;
  private dataController: DataController;

  constructor(private bot: Bot) {
    this.dataController = new DataController(this.bot);
    this.modelController = new ModelController(this.bot);
    this.conversationController = new ConversationController(this.bot);
    this.copyWriterController = new CopyWriterController(
      this.bot,
      this.modelController,
      this.conversationController,
      this.dataController,
    );
    this.postCreatorController = new PostCreatorController(
      this.bot,
      this.modelController,
      this.conversationController,
      this.dataController,
    );
    this.offerCreatorController = new OfferCreatorController(
      this.bot,
      this.modelController,
      this.conversationController,
      this.dataController,
    );
    this.balanceController = new BalanceController(this.bot);
    this.tokenCountingController = new TokenCountingController(this.bot);
    this.outputController = new OutputController(
      this.bot,
      this.tokenCountingController,
    );
    this.groupController = new GroupController(this.bot);

    this.inputController = new InputController(
      this.bot,
      this.balanceController,
      this.outputController,
    );
  }

  public bind() {
    this.modelController.bind();
    this.dataController.bind();
    this.conversationController.bind();
    this.copyWriterController.bind();
    this.offerCreatorController.bind();
    this.postCreatorController.bind();
    this.tokenCountingController.bind();
    this.groupController.bind();

    this.bot.addCQListener(async (q) => {
      if (q.data?.startsWith("agent-")) {
        const user = await this.bot.getUser(q, {
          conversations: true,
          agent: true,
        });
        await this.onStartConversation(user, +q.data.substring(6));
      }
    });

    this.inputController.bind();
  }

  private async onStartConversation(user: User, agentId: number) {
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
          ? [Btn('Взять информацию из раздела "Обо мне"', "from-data")]
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
