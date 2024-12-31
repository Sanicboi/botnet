import TelegramBot from "node-telegram-bot-api";
import { Router } from "./router";
import { User } from "../entity/User";
import { bot } from ".";
import { Btn } from "./utils";

/**
 * This class is a router that processes everything in settings
 */
export class SettingsRouter extends Router {
  /**
   * Creates a new router
   */
  constructor() {
    super();

    this.onCallback = this.onCallback.bind(this);
    this.onText = this.onText.bind(this);
  }

  /**
   * Callback on Callback Query
   * @todo rename
   * @param q Callback Query
   * @returns Nothing
   */
  public async onCallback(q: TelegramBot.CallbackQuery) {
    if (q.data === "change-name") {
      const user = await Router.manager.findOneBy(User, {
        chatId: String(q.from.id),
      });
      if (!user) return;
      user.waitingForName = true;
      await Router.manager.save(user);
      await bot.sendMessage(
        q.from.id,
        "Пришлите мне ваше имя. Я буду обращаться к вам по этому имени! 😊",
      );
    }
    if (q.data === "toggle-count") {
      const user = await Router.manager.findOneBy(User, {
        chatId: String(q.from.id),
      });
      if (!user) return;
      user.countTokens = !user.countTokens;
      await Router.manager.save(user);
      await bot.sendMessage(
        q.from.id,
        `📊 Подсчёт токенов — это полезная функция, которая позволяет вам отслеживать, сколько токенов вы тратите на взаимодействие с нейросетью. В подсчёте токенов учитывается ваш запрос, ответ и контекст общения (память). 
  
  Вот как это работает:
  
  ✅ Включить - Вы будете видеть количество потраченных токенов после каждого ответа и сможете понимать свой расход токенов в диалоге на текущий момент. 
  
  ✖️ Отключить - Вы не будете видеть количество потраченных токенов после каждого ответа. Это может быть полезно для тех, кто предпочитает более чистый интерфейс или не хочет отвлекаться на подсчёт токенов во время общения.
  `,
        {
          reply_markup: {
            inline_keyboard: [
              Btn(
                user.countTokens ? "✖️ Отключить" : "✅ Включить",
                "toggle-count",
              ),
              Btn("Назад", "settings"),
            ],
          },
        },
      );
    }

    if (q.data === "change-count") {
      const user = await Router.manager.findOneBy(User, {
        chatId: String(q.from.id),
      });
      if (!user) return;
      await bot.sendMessage(
        q.from.id,
        `📊 Подсчёт токенов — это полезная функция, которая позволяет вам отслеживать, сколько токенов вы тратите на взаимодействие с нейросетью. В подсчёте токенов учитывается ваш запрос, ответ и контекст общения (память). 
  
  Вот как это работает:
  
  ✅ Включить - Вы будете видеть количество потраченных токенов после каждого ответа и сможете понимать свой расход токенов в диалоге на текущий момент. 
  
  ✖️ Отключить - Вы не будете видеть количество потраченных токенов после каждого ответа. Это может быть полезно для тех, кто предпочитает более чистый интерфейс или не хочет отвлекаться на подсчёт токенов во время общения.
  `,
        {
          reply_markup: {
            inline_keyboard: [
              Btn(
                user.countTokens ? "✖️ Отключить" : "✅ Включить",
                "toggle-count",
              ),
              Btn("Назад", "settings"),
            ],
          },
        },
      );
    }

    if (q.data?.startsWith("model-")) {
      const model = q.data.substring(6);
      const user = await Router.manager.findOneBy(User, {
        chatId: String(q.from.id),
      });
      if (!user) return;
      //@ts-ignore
      user.model = model;
      await Router.manager.save(user);
      await bot.sendMessage(q.from.id, "Модель успешно изменена");
    }

    if (q.data === "change-model") {
      await bot.sendMessage(q.from.id, "[Подробнее о моделях](https://docs.google.com/document/d/1VkachN7pXjuVQ5ybHeZLoNLZ2hcXLAALbwIsDmXjtoc/edit)", {
        reply_markup: {
          inline_keyboard: [
            Btn("GPT 4 Omni mini", "model-gpt-4o-mini"),
            Btn("GPT 4 Omni", "model-gpt-4o"),
            Btn("GPT 4 Turbo", "model-gpt-4-turbo"),
            Btn("Назад", "settings"),
          ],
        },
        parse_mode: 'Markdown'
      });
    }
  }

  /**
   * Callback on text messages
   * @param msg Message Object
   * @param u User object
   * @returns Whether the user was waiting for name or not
   * @todo Refactor the usage of User objects
   */
  public async onText(msg: TelegramBot.Message, u: User): Promise<boolean> {
    if (u.waitingForName) {
      u.name = msg.text!;
      u.waitingForName = false;
      await Router.manager.save(u);
      await bot.sendMessage(msg.from!.id, "Имя изменено", {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Назад",
                callback_data: "settings",
              },
            ],
          ],
        },
      });
      return true;
    }
    return false;
  }
}
