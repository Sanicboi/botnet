import { AppDataSource } from "../data-source";
import { User } from "../entity/User";
import { Btn } from "../neuro/utils";
import { SupportedModels } from "../utils/Models";
import { Bot } from "./Bot";

const manager = AppDataSource.manager;

export class SettingsController {
  constructor(private bot: Bot) {
    this.bot.onSettings(this.settings.bind(this));
    this.bot.onSetting(this.setting.bind(this));
    this.bot.onModel(this.model.bind(this));
    this.bot.onCount(this.count.bind(this));
  }

  private async settings(user: User) {
    await this.bot.bot.sendMessage(+user.chatId, "Настройки ⚙️", {
      reply_markup: {
        inline_keyboard: [
          Btn("Изменить модель", "settings-model"),
          Btn("Подсчет токенов", "settings-count"),
        ],
      },
    });
  }

  private async setting(user: User, setting: string) {
    if (setting === "model") {
      await this.bot.bot.sendMessage(
        +user.chatId,
        "[Подробнее о моделях](https://docs.google.com/document/d/1VkachN7pXjuVQ5ybHeZLoNLZ2hcXLAALbwIsDmXjtoc/edit)",
        {
          reply_markup: {
            inline_keyboard: [
              Btn("GPT 4 Omni mini", "model-gpt-4o-mini"),
              Btn("GPT 4 Omni", "model-gpt-4o"),
              Btn("GPT 4 Turbo", "model-gpt-4-turbo"),
              Btn("Назад", "settings"),
            ],
          },
        },
      );
    } else if (setting === "count") {
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
  }

  private async model(user: User, model: string) {
    user.model = model as SupportedModels;
    await manager.save(user);
    await this.bot.bot.sendMessage(+user.chatId, "Модель успешно изменена", {
      reply_markup: {
        inline_keyboard: user.agentId ? [] : [Btn("Назад", "settings")],
      },
    });
  }

  private async count(user: User) {
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
