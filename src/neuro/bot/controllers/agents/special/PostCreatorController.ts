import { InlineKeyboardButton } from "node-telegram-bot-api";
import { AppDataSource } from "../../../../../data-source";
import { AgentModel } from "../../../../../entity/assistants/AgentModel";
import { User } from "../../../../../entity/User";
import { Bot } from "../../../../Bot";
import { Btn } from "../../../../utils";
import { IController } from "../../../Controller";
import { ModelController } from "../ModelController";
import { Conversation } from "../../../../../entity/Conversation";
import { ConversationController } from "../conversations/ConversationController";
import { DataController } from "../DataController";

const manager = AppDataSource.manager;

export class PostCreatorController implements IController {
  private readonly _id = 3;
  private readonly _firstMessage =
    "Приветствую!👋 Я AI составитель постов. Я помогу тебе с написанием постов.\nПрежде чем написать пост, давай определимся с типом, а потом со стилем контента, выбирай по кнопкам ниже👇\n\nНе знаешь какой выбрать? Смотри документ: https://docs.google.com/document/d/1Eh5FZzDEh6_ErGL1BHk0U-_8YxejNrFBPsrOYOB7Fko/edit";
  private readonly _secondMessage = "";

  constructor(
    private bot: Bot,
    private modelController: ModelController,
    private conversationController: ConversationController,
    private dataController: DataController,
  ) {}

  public bind() {}

  private async onTypes(user: User) {
    await this.dataController.resetData(user);
    user.agent = new AgentModel();
    user.agent.id = this._id;

    await manager.save(user);

    await this.bot.bot.sendMessage(+user.chatId, this._firstMessage, {
      reply_markup: {
        inline_keyboard: [
          Btn(`Информационный`, `posttype-Информационный`),
          Btn(`Пользовательский`, `posttype-Пользовательский`),
          Btn(`Полезный`, `posttype-Полезный`),
        ],
      },
    });
  }

  private async onType(user: User, type: string) {
    user.dialogueData += `Тип поста: ${type}\n`;
    await manager.save(user);

    await this.bot.bot.sendMessage(+user.chatId, this._secondMessage, {
      reply_markup: {
        inline_keyboard: [
          Btn(`Мотивационный`, `poststyle-Мотивационный`),
          Btn(`Деловой`, `poststyle-Деловой`),
          Btn(`Экспертный`, `poststyle-Экспертный`),
          Btn(`Обучающий`, `poststyle-Обучающий`),
          Btn(`Разговорный`, `poststyle-Разговорный`),
          Btn(`Научный`, `poststyle-Научный`),
          Btn(`Рекламный`, `poststyle-Рекламный`),
          Btn(`Вызывающий`, `poststyle-Вызывающий`),
          Btn(`Подтвердить стили`, "poststyles-confirm"),
          Btn(`Отменить стили`, "poststyles-reject"),
        ],
      },
    });
  }

  private async onStyle(user: User, style: string, msgId: number) {
    if (user.dialogueData.includes(style)) {
      const split = user.dialogueData.split("\n");
      user.dialogueData = split.filter((el) => !el.includes(style)).join("\n");
    } else {
      user.dialogueData += `Стиль поста: ${style}\n`;
    }
    await manager.save(user);

    await this.bot.bot.deleteMessage(+user.chatId, msgId);
    await this.bot.bot.sendMessage(+user.chatId, this._secondMessage, {
      reply_markup: {
        inline_keyboard: this.getButtons(user),
      },
    });
  }

  private async onRejectStyles(user: User) {
    user.dialogueData = user.dialogueData
      .split("\n")
      .filter((el) => !el.includes("Стиль поста:"))
      .join("\n");

    await this.bot.bot.sendMessage(+user.chatId, this._secondMessage, {
      reply_markup: {
        inline_keyboard: this.getButtons(user),
      },
    });
  }

  private async onConfirmStyles(user: User) {
    await this.conversationController.markAllAsInactive(user);
    const conversation = new Conversation();
    conversation.agent = user.agent!;
    conversation.user = user;
    conversation.api = user.model.api;
    await manager.save(conversation);

    await this.bot.bot.sendMessage(
      +user.chatId,
      this.getThirdMessage(user.dialogueData),
    );

    await this.modelController.sendSelectAPI(+user.chatId);
  }

  private getThirdMessage(styles: string): string {
    return `🚀Супер, со стилем и типом определились:\n${styles}\nЧтобы предложить максимально релевантный текст, пришли мне вводные данные для написания поста:\n1)Тема поста \n2)Целевая аудитория (Для кого создается пост)\n3)Ключевые слова (Есть ли что-то, что ты хотел(а) бы затронуть в посте)\n4)Цель поста (Какая цель данного поста: Продажа продуктов бизнеса; сообщить новость…)\n\nИнформацию пришли мне в ответном сообщении) \nОжидаю информацию)😉`;
  }

  private getButtons(user: User): InlineKeyboardButton[][] {
    return [
      Btn(
        `Мотивационный ${user.dialogueData.includes(`Стиль поста: Мотивационный\n`) ? "✅" : ""}`,
        `poststyle-Мотивационный`,
      ),
      Btn(
        `Деловой ${user.dialogueData.includes(`Стиль поста: Деловой\n`) ? "✅" : ""}`,
        `poststyle-Деловой`,
      ),
      Btn(
        `Экспертный ${user.dialogueData.includes(`Стиль поста: Экспертный\n`) ? "✅" : ""}`,
        `poststyle-Экспертный`,
      ),
      Btn(
        `Обучающий ${user.dialogueData.includes(`Стиль поста: Обучающий\n`) ? "✅" : ""}`,
        `poststyle-Обучающий`,
      ),
      Btn(
        `Разговорный ${user.dialogueData.includes(`Стиль поста: Разговорный\n`) ? "✅" : ""}`,
        `poststyle-Разговорный`,
      ),
      Btn(
        `Научный ${user.dialogueData.includes(`Стиль поста: Научный\n`) ? "✅" : ""}`,
        `poststyle-Научный`,
      ),
      Btn(
        `Рекламный ${user.dialogueData.includes(`Стиль поста: Рекламный\n`) ? "✅" : ""}`,
        `poststyle-Рекламный`,
      ),
      Btn(
        `Вызывающий ${user.dialogueData.includes(`Стиль поста: Вызывающий\n`) ? "✅" : ""}`,
        `poststyle-Вызывающий`,
      ),
      Btn(`Подтвердить стили`, "poststyles-confirm"),
      Btn(`Отменить стили`, "poststyles-reject"),
    ];
  }
}
