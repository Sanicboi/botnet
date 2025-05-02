import { AppDataSource } from "../data-source";
import { User } from "../entity/User";
import { Btn } from "./utils";
import { SupportedModels } from "../utils/Models";
import { Bot } from "./Bot";
import { OutputFormat } from "../utils/OutputFormat";

let map: Map<string, string> = new Map();
map.set(
  "gpt-4o-mini",
  `
  GPT-4 Omni Mini – это уменьшенная версия GPT-4, оптимизированная для задач с умеренной нагрузкой. Она сохраняет ключевые возможности оригинальной модели, но работает быстрее и требует меньше ресурсов, что делает ее идеальной для повседневного использования.  
Модель отлично справляется с написанием коротких текстов, ответами на вопросы, помощью в обучении и созданием простого контента. Благодаря своей компактности, GPT-4 Omni Mini легко интегрируется в мобильные приложения и устройства с ограниченными вычислительными мощностями, обеспечивая идеальный баланс между качеством и производительностью.
GPT-4 Omni mini
- Ум: 🟢🟢🟢🟡🟡 (3)
- Скорость: 🟢🟢🟢🟢🟡 (4)
- Цена: 🟢🟡🟡🟡🟡 (1)`,
);
map.set(
  "gpt-4-turbo",
  `
  GPT-4 Turbo – это ускоренная версия GPT-4, созданная для приложений, где важна молниеносная скорость отклика. Модель обеспечивает быструю генерацию текста без потери качества, что делает ее идеальной для чат-ботов, голосовых помощников и других решений в реальном времени.  
Она особенно эффективна в сценариях, требующих мгновенной обратной связи: онлайн-поддержка клиентов, игровой ИИ или системы рекомендаций. GPT-4 Turbo гарантирует высокую производительность даже при большом количестве одновременных запросов, помогая вашему бизнесу работать без задержек.

- Ум: 🟢🟢🟢🟢🟡 (4)
- Скорость: 🟢🟢🟢🟢🟢 (5)
- Цена: 🟢🟡🟡🟡🟡 (1)
  `,
);
map.set(
  "gpt-4o",
  `
GPT-4 Omni – это версия GPT-4, созданная для максимального понимания контекста и мультизадачности. Она способна работать с самыми разными типами данных и задачами: от перевода и суммаризации текста до создания контента и решения аналитических задач.  
Модель адаптируется к любым сферам применения – будь то медицинская диагностика, финансовый анализ или автоматизация процессов. GPT-4 Omni станет вашим универсальным помощником, который поможет повысить эффективность работы и справиться с самыми сложными вызовами.
GPT-4 Omni
- Ум: 🟢🟢🟢🟢🟢 (5)
- Скорость: 🟢🟢🟢🟢🟡 (4)
- Цена: 🟢🟡🟡🟡🟡 (1)
  `,
);
map.set(
  "gpt-4.1",
  `
  Передовая модель GPT для сложных задач
  - Ум: 🟢🟢🟢🟢🟢 (5)
  - Скорость: 🟢🟢🟢🟢🟡 (4)
  - Цена: 🟢🟢🟢🟡🟡 (3)
  `,
);
map.set(
  "o4-mini",
  `Бюджетная версия OpenAI O4, заточенная под глубинное мышление.
  - Ум: 🟢🟢🟢🟢🟢 (5)
  - Скорость: 🟢🟢🟢🟡🟡 (4)
  - Цена: 🟢🟢🟢🟢🟡 (4)
  `,
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
              Btn(
                `GPT 4 Omni mini ${user.model === "gpt-4o-mini" ? "✅" : ""}`,
                "model-gpt-4o-mini",
              ),
              Btn(
                `GPT 4 Omni ${user.model === "gpt-4o" ? "✅" : ""}`,
                "model-gpt-4o",
              ),
              Btn(
                `GPT 4 Turbo ${user.model === "gpt-4-turbo" ? "✅" : ""}`,
                "model-gpt-4-turbo",
              ),
              Btn(
                `OpenAI o4 mini ${user.model === "o4-mini" ? "✅" : ""}`,
                "model-o4-mini",
              ),
              Btn(
                `GPT 4.1 ${user.model === "gpt-4.1" ? "✅" : ""}`,
                "model-gpt-4.1",
              ),
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
