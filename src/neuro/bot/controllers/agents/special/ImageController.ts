import { AppDataSource } from "../../../../../data-source";
import { User } from "../../../../../entity/User";
import { api } from "../../../../apis/API";
import { Bot } from "../../../../Bot";
import { Btn } from "../../../../utils";
import { IController } from "../../../Controller";

const manager = AppDataSource.manager;

export class ImageController implements IController {
  constructor(private bot: Bot) {}

  public bind() {
    this.bot.addFreeTextListener(async (msg) => {
      const user = await this.bot.getUser(msg);
      if (user.usingImageGeneration) {
        await this.onGenerateImage(user, msg.text!);
      }
    });

    this.bot.addCQListener(async (q) => {
      if (q.data === "images") {
        await this.onEnterImage(q.from.id);
      }
      if (q.data?.startsWith("res-")) {
        const user = await this.bot.getUser(q);
        await this.onResolution(user, q.data.substring(4));
      }
    });
  }

  private async onEnterImage(chatId: number) {
    await this.bot.bot.sendMessage(chatId, "Выберите разрешение", {
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

  private async onResolution(user: User, res: string) {
    const resolution = res as "1024x1024" | "1024x1792" | "1792x1024";
    user.imageRes = resolution;
    user.usingImageGeneration = true;
    await manager.save(user);
    await this.bot.bot.sendMessage(
      +user.chatId,
      "Напишите, что вы хотите увидеть, и я сгенерирую изображение 😉",
    );
  }

  private async onGenerateImage(user: User, text: string) {
    const url = await api.openai.generateImage(text, user.imageRes);
    await this.bot.bot.sendPhoto(+user.chatId, url);
  }
}
