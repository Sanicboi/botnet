import { AppDataSource } from "../../../../../data-source";
import { AgentModel } from "../../../../../entity/assistants/AgentModel";
import { Conversation } from "../../../../../entity/Conversation";
import { User } from "../../../../../entity/User";
import { Bot } from "../../../../Bot";
import { Btn } from "../../../../utils";
import { IController } from "../../../Controller";
import { ConversationController } from "../conversations/ConversationController";
import { ModelController } from "../ModelController";

const manager = AppDataSource.manager;

/**
 * Это особый агент - копирайтер
 * TODO: сообщения надо изменить
 */
export class CopyWriterController implements IController {
  private readonly _id = 1;
  private readonly _firstMessage = "";
  private readonly _secondMessage = "Выберите тон текста.";
  private readonly _thirdMessage =
    "Отлично, со стилем и тоном определились! 😉\n\nТеперь для создания текста мне необходимо получить от тебя вводную информацию:\n1)Тема\n2)Для кого создается текст  (студенты, инвесторы…)\n3)Размер текста по времени (5 мин; 10 мин; 30 мин)\n\nОтвет пришли мне в ответном сообщении!\nОжидаю информацию)😉";

  constructor(
    private bot: Bot,
    private modelController: ModelController,
    private conversationController: ConversationController,
  ) {}

  public bind() {}

  private async onStyles(user: User) {
    user.agent = new AgentModel();
    user.agent.id = this._id;

    await manager.save(user);

    const agent = await manager.findOneBy(AgentModel, {
      id: this._id,
    });

    if (!agent) return;

    await this.bot.bot.sendMessage(+user.chatId, this._firstMessage, {
      reply_markup: {
        inline_keyboard: [
          Btn(`Официальный`, `textstyle-Официальный`),
          Btn(`Научный`, `textstyle-Научный`),
          Btn(`Публицистический`, `textstyle-Публицистический`),
          Btn(`Художественный`, `textstyle-Художественный`),
          Btn(`Разговорный`, `textstyle-Разговорный`),
          Btn(`Рекламный`, `textstyle-Рекламный`),
        ],
      },
    });
  }

  private async onStyle(user: User, style: string) {
    user.dialogueData += `Стиль текста: ${style}\n`;
    await manager.save(user);
    await this.bot.bot.sendMessage(
      +user.chatId,
      `${user.dialogueData}\n${this._secondMessage}`,
      {
        reply_markup: {
          inline_keyboard: [
            Btn(`Профессиональный`, `texttone-Профессиональный`),
            Btn(`Дружелюбный`, `texttone-Дружелюбный`),
            Btn(`Эмоциональный`, `texttone-Эмоциональный`),
            Btn(`Ироничный`, `texttone-Ироничный`),
            Btn(`Информативный`, `texttone-Информативный`),
            Btn(`Воодушевляющий`, `texttone-Воодушевляющий`),
            Btn(`Дерзкий`, `texttone-Дерзкий`),
            Btn(`Спокойный / уравновешенный`, `texttone-Спокойный`),
          ],
        },
      },
    );
  }

  private async onTone(user: User, tone: string) {
    user.dialogueData += `Тон текста: ${tone}\n`;
    await manager.save(user);

    await this.conversationController.markAllAsInactive(user);

    const conversation = new Conversation();
    conversation.agent = user.agent!;
    conversation.api = user.model.api;
    conversation.user = user;
    await manager.save(conversation);

    await this.bot.bot.sendMessage(
      +user.chatId,
      `${user.dialogueData}\n${this._thirdMessage}`,
    );
    // я не помню, есть ли у него пример промпта
    await this.modelController.sendSelectAPI(+user.chatId);
  }
}
