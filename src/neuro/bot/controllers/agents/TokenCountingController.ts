import { AppDataSource } from "../../../../data-source";
import { User } from "../../../../entity/User";
import { Bot } from "../../../Bot";
import { Btn } from "../../../utils";
import { IController } from "../../Controller";
import { Converter } from "../balance/Converter";

const manager = AppDataSource.manager;

export class TokenCountingController implements IController {
  public bind() {
    this.bot.addCQListener(async (q) => {
      const user = await this.bot.getUser(q);
      if (q.data === "setting-count") {
        await this.onTokenCountSetting(user);
      }

      if (q.data === "toggle-count") {
        await this.onToggleTokenCount(user);
      }
    });
  }

  constructor(private bot: Bot) {}

  public async sendTokenCount(user: User, numTokens: number) {
    if (user.countTokens) {
      await this.bot.bot.sendMessage(
        +user.chatId,
        `Количество токенов: ${Converter.TKSMT(numTokens, user.model)}`,
      );
    }
  }

  private async onTokenCountSetting(user: User) {
    await this.bot.bot.sendMessage(
      +user.chatId,
      `📊 Подсчёт токенов — это полезная функция, которая позволяет вам отслеживать, сколько токенов вы тратите на взаимодействие с нейросетью. В подсчёте токенов учитывается ваш запрос, ответ и контекст общения (память).\nВот как это работает:\n\n✅ Включить - Вы будете видеть количество потраченных токенов после каждого ответа и сможете понимать свой расход токенов в диалоге на текущий момент.\n\n✖️ Отключить - Вы не будете видеть количество потраченных токенов после каждого ответа. Это может быть полезно для тех, кто предпочитает более чистый интерфейс или не хочет отвлекаться на подсчёт токенов во время общения.`,
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

  private async onToggleTokenCount(user: User) {
    user.countTokens = !user.countTokens;
    await manager.save(user);
    await this.bot.bot.sendMessage(
      +user.chatId,
      `Подсчет токенов ${user.countTokens ? "включен" : "выключен"}`,
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
}
