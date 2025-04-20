import { AppDataSource } from "../../data-source";
import { User } from "../../entity/User";
import { Btn } from "../utils";
import { Bot } from "../Bot";
import { DialogController } from "../DialogController";

const manager = AppDataSource.manager;

export class PostAgent {
  constructor(
    private bot: Bot,
    private dialogController: DialogController,
  ) {
    bot.onPostTypes(this.types.bind(this));
    bot.onPostType(this.type.bind(this));
    bot.onPostStyle(this.style.bind(this));
    bot.onPostStylesConfirm(this.confirm.bind(this));
    bot.onPostStylesReject(this.reject.bind(this));
  }

  private async types(user: User) {
    user.agentId = 2;
    user.agent!.id = 2;
    await manager.save(user);
    await this.bot.bot.sendMessage(
      +user.chatId,
      "Приветствую!👋 Я AI составитель постов. Я помогу тебе с написанием постов.\nПрежде чем написать пост, давай определимся с типом, а потом со стилем контента, выбирай по кнопкам ниже👇\n\nНе знаешь какой выбрать? Смотри документ: https://docs.google.com/document/d/1Eh5FZzDEh6_ErGL1BHk0U-_8YxejNrFBPsrOYOB7Fko/edit",
      {
        reply_markup: {
          inline_keyboard: [
            Btn(`Информационный`, `posttype-Информационный`),
            Btn(`Пользовательский`, `posttype-Пользовательский`),
            Btn(`Полезный`, `posttype-Полезный`),
          ],
        },
      },
    );
  }

  private async type(user: User, type: string) {
    user.dialogueData += `Тип поста: ${type}\n`;
    await manager.save(user);
    await this.bot.bot.sendMessage(
      +user.chatId,
      "Отлично, с типом определились. Теперь выбери стиль",
      {
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
      },
    );
  }

  private async style(user: User, style: string, msgId: number) {
    if (user.dialogueData.includes(style)) {
      const split = user.dialogueData.split("\n");
      user.dialogueData = split.filter((el) => !el.includes(style)).join("\n");
    } else {
      user.dialogueData += `Стиль поста: ${style}\n`;
    }
    await manager.save(user);
    await this.bot.bot.deleteMessage(+user.chatId, msgId);
    await this.bot.bot.sendMessage(+user.chatId, `Выбери стили`, {
      reply_markup: {
        inline_keyboard: [
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
        ],
      },
    });
  }

  private async confirm(user: User) {
    await this.dialogController.createDialog(
      user,
      2,
      `🚀Супер, со стилем и типом определились:\n${user.dialogueData}\nЧтобы предложить максимально релевантный текст, пришли мне вводные данные для написания поста:\n1)Тема поста \n2)Целевая аудитория (Для кого создается пост)\n3)Ключевые слова (Есть ли что-то, что ты хотел(а) бы затронуть в посте)\n4)Цель поста (Какая цель данного поста: Продажа продуктов бизнеса; сообщить новость…)\n\nИнформацию пришли мне в ответном сообщении) \nОжидаю информацию)😉`,
    );
  }

  private async reject(user: User) {
    user.dialogueData = user.dialogueData
      .split("\n")
      .filter((el) => !el.includes("Стиль поста:"))
      .join("\n");
    await manager.save(user);
    await this.bot.bot.sendMessage(+user.chatId, `Выбери стили`, {
      reply_markup: {
        inline_keyboard: [
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
        ],
      },
    });
  }
}
