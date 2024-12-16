import TelegramBot from "node-telegram-bot-api";
import { Router } from "./router";
import { User } from "../entity/User";
import { bot } from ".";
import { Btn } from "./utils";

/**
 * This router handles image generation
 */
export class ImagesRouter extends Router {
  /**
   * Creates a new instance of the router
   */
  constructor() {
    super();
    this.onQuery = this.onQuery.bind(this);
    this.onText = this.onText.bind(this);
  }

  /**
   * Handle callback query
   * @param q Callback query object
   * @returns If waiters should be kept
   */
  public async onQuery(q: TelegramBot.CallbackQuery): Promise<boolean> {
    if (q.data === "images") {
      await bot.sendMessage(q.from.id, "Выберите функцию", {
        reply_markup: {
          inline_keyboard: [
            Btn("🖼️ Генерация картинок", "gen"),
            Btn("Назад", "menu-1"),
          ],
        },
      });
      return true;
    }

    if (q.data === "gen") {
      await bot.sendMessage(q.from.id, "Выберите разрешение", {
        reply_markup: {
          inline_keyboard: [
            Btn("1024x1024", "res-1024x1024"),
            Btn("1024x1792", "res-1024x1792"),
            Btn("1792x1024", "res-1792x1024"),
            Btn("Назад", "images"),
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
          "Напишите, что вы хотите увидеть, и я сгенерирую изображение 😉",
        );
        return true;
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

    return false;
  }

  /**
   * Handles text input
   * @param msg Message Object
   * @param user User Object
   * @returns If the message has been handled
   */
  public async onText(msg: TelegramBot.Message, user: User): Promise<boolean> {
    if (user.usingImageGeneration) {
      await Router.queue.add("j", {
        type: "neuro",
        actionId: "image",
        task: "image",
        userId: user.chatId,
        prompt: msg.text,
        msgId: String(msg.message_id),
      });
      return true;
    }
    return false;
  }
}
