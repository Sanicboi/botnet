import { AppDataSource } from "../../data-source";
import { User } from "../../entity/User";
import { Btn } from "../utils";
import { Agent } from "../Agent";
import { Bot } from "../Bot";

const manager = AppDataSource.manager;

export class ImageAgent {
  constructor(private bot: Bot) {
    this.bot.onEnterImage(this.enterImage.bind(this));
    this.bot.onSetResolution(this.setResolution.bind(this));
    this.bot.onGenerateImage(this.generateImage.bind(this));
  }

  private async generateImage(user: User, text: string) {
    const result = await Agent.createImage(text, user.imageRes);
    await this.bot.bot.sendPhoto(+user.chatId, result);
  }

  private async enterImage(user: User) {
    await this.bot.bot.sendMessage(+user.chatId, "Выберите разрешение", {
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

  private async setResolution(user: User, res: string) {
    if (res !== "1024x1024" && res !== "1024x1792" && res !== "1792x1024")
      throw new Error("Wrong resolution");
    user.imageRes = res;
    user.usingImageGeneration = true;
    await manager.save(user);
    await this.bot.bot.sendMessage(
      +user.chatId,
      "Напишите, что вы хотите увидеть, и я сгенерирую изображение 😉",
    );
  }
}
