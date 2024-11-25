import TelegramBot from "node-telegram-bot-api";
import { Router } from "./router";
import { User } from "../entity/User";
import { bot } from ".";

export class ImagesRouter extends Router {
  constructor() {
    super();
    this.onQuery = this.onQuery.bind(this);
    this.onText = this.onText.bind(this);
  }

  public async onQuery(q: TelegramBot.CallbackQuery) {
    if (q.data === "images") {
      await bot.sendMessage(q.from.id, "Выберите функцию", {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Генерация картинок",
                callback_data: "gen",
              },
            ],
            [
              {
                text: "Назад",
                callback_data: "menu",
              },
            ],
          ],
        },
      });
    }

    if (q.data === "gen") {
      await bot.sendMessage(q.from.id, "Выберите разрешение", {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "1024x1024",
                callback_data: "res-1024x1024",
              },
            ],
            [
              {
                text: "1024x1792",
                callback_data: "res-1024x1792",
              },
            ],
            [
              {
                text: "1792x1024",
                callback_data: "res-1792x1024",
              },
            ],
            [
              {
                text: "Назад",
                callback_data: "images",
              },
            ],
          ],
        },
      });
    }

    if (q.data?.startsWith("res-")) {
      const user = await Router.manager.findOneBy(User, {
        chatId: String(q.from.id),
      });
      if (user) {
        user.usingImageGeneration = true;
        //@ts-ignore
        user.imageRes = q.data.substring(4);
        await Router.manager.save(user);
        await bot.sendMessage(
          q.from.id,
          "Пришлите мне промпт, и я сгенерирую изображение",
        );
      }
    }

    if (q.data === "stop-image") {
      const user = await Router.manager.findOneBy(User, {
        chatId: String(q.from.id),
      });
      if (user) {
        user.usingImageGeneration = false;
        user.imageRes = "1024x1024";
        await Router.manager.save(user);
        await bot.sendMessage(q.from.id, "Генерация завершена.");
      }
    }
  }

  public async onText(msg: TelegramBot.Message, user: User): Promise<boolean> {
    if (user.usingImageGeneration) {
      await Router.queue.add("j", {
        type: "neuro",
        actionId: "image",
        task: "image",
        userId: user.chatId,
        prompt: msg.text,
      });
      return true;
    }
    return false;
  }
}
