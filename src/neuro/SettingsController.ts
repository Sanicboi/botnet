import { AppDataSource } from "../data-source";
import { User } from "../entity/User";
import { Btn } from "./utils";
import { SupportedModels } from "../utils/Models";
import { Bot } from "./Bot";
import { OutputFormat } from "../utils/OutputFormat";

let map: Map<string, string> = new Map();
map.set(
  "gpt-4o-mini",
  "Уменьшенная версия GPT-4, оптимизированная для менее требовательных задач.",
);
map.set(
  "gpt-4-turbo",
  "Ускоренная версия GPT-4, предназначенная для быстрой работы в интерактивных приложениях.",
);
map.set(
  "gpt-4o",
  "Версия GPT-4, ориентированная на максимальное понимание контекста и мультизадачность.",
);
map.set("gpt-4.1", "Передовая модель GPT для сложных задач");
map.set(
  "o4-mini",
  "Бюджетная версия OpenAI O4, заточенная под глубинное мышление.",
);

const manager = AppDataSource.manager;

export class SettingsController {
  constructor(private bot: Bot) {
    this.bot.onSettings(this.settings.bind(this));
    this.bot.onSetting(this.setting.bind(this));
    this.bot.onModel(this.model.bind(this));
    this.bot.onCount(this.count.bind(this));
    this.bot.onFormat(this.format.bind(this));
  }

  private async settings(user: User) {
    await this.bot.bot.sendMessage(+user.chatId, "Настройки ⚙️", {
      reply_markup: {
        inline_keyboard: [
          Btn("Изменить модель", "settings-model"),
          Btn("Подсчет токенов", "settings-count"),
          Btn("Формат ответа", "settings-format"),
        ],
      },
    });
  }

  private async setting(user: User, setting: string) {
    if (setting === "model") {
      await this.bot.bot.sendMessage(
        +user.chatId,
        `Выбранная модель: ${user.model}\n${map.get(user.model)}\nДоступные модели:`,
        {
          reply_markup: {
            inline_keyboard: [
              Btn(`GPT 4 Omni mini ${user.model === 'gpt-4o-mini' ? '✅' : ''}`, "model-gpt-4o-mini"),
              Btn(`GPT 4 Omni ${user.model === 'gpt-4o' ? '✅' : ''}`, "model-gpt-4o"),
              Btn(`GPT 4 Turbo ${user.model === 'gpt-4-turbo' ? '✅' : ''}`, "model-gpt-4-turbo"),
              Btn(`OpenAI o4 mini ${user.model === 'o4-mini' ? '✅' : ''}`, "model-o4-mini"),
              Btn(`GPT 4.1 ${user.model === 'gpt-4.1' ? '✅' : ''}`, "model-gpt-4.1"),
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
    } else if (setting === "format") {
      await this.bot.bot.sendMessage(+user.chatId, `Выберите формат ответа:`, {
        reply_markup: {
          inline_keyboard: [
            Btn(
              `Стандартный (текст или документ html) ${user.outputFormat === "text" ? "✅" : ""}`,
              "format-text",
            ),
            Btn(
              `HTML ${user.outputFormat === "html" ? "✅" : ""}`,
              "format-html",
            ),
            Btn(
              `Документ Word ${user.outputFormat === "docx" ? "✅" : ""}`,
              "format-docx",
            ),
            Btn(
              `Аудио ${user.outputFormat === "audio" ? "✅" : ""}`,
              "format-audio",
            ),
          ],
        },
      });
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

  private async format(user: User, format: string) {
    const f = format as OutputFormat;
    user.outputFormat = f;
    await manager.save(user);
    await this.bot.bot.sendMessage(
      +user.chatId,
      `Формат ответа изменен на ${f}`,
      {
        reply_markup: {
          inline_keyboard: [Btn("Назад", "settings")],
        },
      },
    );
  }
}
