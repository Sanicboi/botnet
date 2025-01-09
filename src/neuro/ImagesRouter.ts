import TelegramBot from "node-telegram-bot-api";
import { Router } from "./router";
import { User } from "../entity/User";
import { bot, openai } from ".";
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
   * @returns If waiters should be reset
   */
  public async onQuery(
    q: TelegramBot.CallbackQuery,
    user: User,
  ): Promise<boolean> {
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
      return false;
    }

    if (q.data?.startsWith("res-")) {
      user.usingImageGeneration = true;
      //@ts-ignore
      user.imageRes = q.data.substring(4);
      await Router.manager.save(user);
      await bot.sendMessage(
        q.from.id,
        "Напишите, что вы хотите увидеть, и я сгенерирую изображение 😉",
      );
      return false;
    }

    if (q.data === "stop-image") {
      user.usingImageGeneration = false;
      user.imageRes = "1024x1024";
      await Router.manager.save(user);
      await bot.sendMessage(q.from.id, "Генерация завершена.");
      return true;
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
      const image = await openai.images.generate({
        prompt: msg.text ?? "",
        model: "dall-e-3",
        n: 1,
        quality: "standard",
        size: user.imageRes,
      });
      await bot.sendPhoto(msg.from!.id, image.data[0].url!);
      return true;
    }
    return false;
  }
}
