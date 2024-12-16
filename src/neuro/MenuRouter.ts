import TelegramBot, { InlineKeyboardButton } from "node-telegram-bot-api";
import { bot } from ".";
import { Assistant } from "../entity/assistants/Assistant";
import { Router } from "./router";
import { User } from "../entity/User";
import dayjs from "dayjs";
import { MessageFormatter } from "../utils/MessageFormatter";
import { Btn } from "./utils";
import { OpenAI } from "./OpenAI";

export class MenuRouter extends Router {
  constructor() {
    super();
    bot.onText(/\/neuro/, async (msg) => {
      try {
        const assistants = await Router.manager.find(Assistant, {
          take: 7,
          where: {},
          order: {
            id: "ASC",
          },
        });
        let result: InlineKeyboardButton[][] = [];
        let u = await Router.manager.findOne(User, {
          where: {
            chatId: String(msg.from!.id),
          },
          relations: {
            action: {
              threads: true,
            },
          },
        });
        if (!u) {
          u = new User();
          u.chatId = String(msg.from!.id);
          await Router.manager.save(u);
        }
        await Router.resetWaiters(u);
        for (const a of assistants) {
          result.push([
            {
              text: a.name,
              callback_data: `a-${a.id}`,
            },
          ]);
        }

        result.push(Btn("👨‍🎨Дизайн", "images"));
        result.push(Btn("Следующая страница", "menu-2"));

        await bot.sendMessage(msg.from!.id, "Выберите категорию сотрудников", {
          reply_markup: {
            inline_keyboard: result,
          },
        });
      } catch (err) {
        Router.logger.fatal(err);
      }
    });

    bot.onText(/\/start/, async (msg) => {
      let user = await Router.manager.findOneBy(User, {
        chatId: String(msg.from!.id),
      });

      if (!user) {
        const refId = msg.text!.split(" ")[1];
        user = new User();
        user.chatId = String(msg.from!.id);
        user.addBalance = Math.round((10000 * 3.4) / 10000);
        if (refId) {
          const creator = await Router.manager.findOneBy(User, {
            chatId: refId,
          });
          if (creator) {
            creator.addBalance += Math.round((3000 * 3.4) / 10000);
            await Router.manager.save(creator);
            user.addBalance += Math.round((5000 * 3.4) / 10000);
          }
        }

        await Router.manager.save(user);
      }
      await Router.resetWaiters(user);

      await bot.sendMessage(
        msg.from!.id,
        "Привет! На связи SmartComarde. Готов улучшить продуктивность своего бизнеса с помощью ИИ? Выбирай категорию меню ниже.",
      );
    });

    bot.onText(/\/deletecontext/, async (msg) => {
      try {
        await OpenAI.deleteThread(msg);
      } catch (err) {
        Router.logger.fatal(err);
      }
    });

    bot.onText(/\/balance/, async (msg) => {
      const user = await Router.manager.findOne(User, {
        where: {
          chatId: String(msg.from!.id),
        },
        relations: {
          threads: true,
        },
      });
      if (!user) return;
      const now = dayjs();
      await Router.resetSub(user);
      await Router.resetWaiters(user);
      await bot.sendMessage(
        msg.from!.id,
        `Баланс и подписка\n\n🟣 Формат доступа:\n⤷ ${user.subscription === "exlusive" ? "Exclusive" : user.subscription === "premium" ? "Premium" : user.subscription === "pro" ? "PRO+" : user.subscription === "lite" ? "Lite" : "Бесплатный доступ"}
         ⤷ Сегодня осталось: ${Math.round((user.leftForToday / 3.4) * 10000)} / ${
           user.subscription === "exlusive"
             ? 135000
             : user.subscription === "premium"
               ? 45000
               : user.subscription === "pro"
                 ? 30000
                 : user.subscription === "lite"
                   ? 5000
                   : 0
         } токенов
         ⤷ Новое пополнение через: ${user.subscription === "none" ? "Нет" : `${24 - now.hour()}:${59 - now.minute()}`}
         ⤷ Следующий платеж: ${user.endDate == null ? "Нет" : user.endDate.toUTCString()}
      
      🟣 Ваш комплект токенов:
         ⤷ ${Math.round((user.addBalance / 3.4) * 10000)}
      
      📦 Если вам не хватает ежедневных токенов по подписке – вы можете купить комплект токенов. Комплект токенов можно использовать в любое время без лимитов. Полезно, когда вам требуется много токенов за раз.`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Купить подписку",
                  callback_data: "b-sub",
                },
              ],
              [
                {
                  text: "Купить токены",
                  callback_data: "b-tokens",
                },
              ],
            ],
          },
        },
      );
    });

    bot.onText(/\/settings/, async (msg) => {
      await bot.sendMessage(msg.from!.id, "Настройки ⚙️", {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Изменить модель",
                callback_data: "change-model",
              },
            ],
            [
              {
                text: "Изменить имя",
                callback_data: "change-name",
              },
            ],
            [
              {
                text: "Подсчет токенов",
                callback_data: "change-count",
              },
            ],
          ],
        },
      });
    });

    bot.onText(/\/ref/, async (msg) => {
      const u = await Router.manager.findOneBy(User, {
        chatId: String(msg.from!.id),
      });
      if (!u) return;
      await bot.sendMessage(
        msg.from!.id,
        `Пригласите друзей и получите 3000 токенов! Ваша реферальная ссылка: https://t.me/NComrades_bot?start=${msg.from!.id}`,
      );
    });

    bot.onText(/\/about/, async (msg) => {
      await MessageFormatter.sendTextFromFileBot(
        bot,
        "about-neuro.txt",
        msg.from!.id,
      );
    });

    bot.onText(/\/help/, async (msg) => {
      await MessageFormatter.sendTextFromFileBot(
        bot,
        "help-neuro.txt",
        msg.from!.id,
      );
    });

    bot.onText(/\/terms/, async (msg) => {
      await MessageFormatter.sendTextFromFileBot(
        bot,
        "terms.txt",
        msg.from!.id,
      );
    });
    this.onCallback = this.onCallback.bind(this);
  }

  public async onCallback(q: TelegramBot.CallbackQuery) {
    try {
      if (q.data === "menu-1") {
        const user = await Router.manager.findOneBy(User, {
          chatId: String(q.from.id),
        });
        if (!user) return;
        if (user.usingImageGeneration) {
          user.usingImageGeneration = false;
          await Router.manager.save(user);
        }

        const assistants = await Router.manager.find(Assistant, {
          take: 7,
          where: {},
          order: {
            id: "ASC",
          },
        });
        let result: InlineKeyboardButton[][] = [];
        for (const a of assistants) {
          result.push([
            {
              text: a.name,
              callback_data: `a-${a.id}`,
            },
          ]);
        }

        result.push(Btn("👨‍🎨Дизайн", "images"));
        result.push(Btn("Следующая страница", "menu-2"));

        await bot.sendMessage(q.from.id, "Выберите категорию сотрудников", {
          reply_markup: {
            inline_keyboard: result,
          },
        });
      }

      if (q.data === "settings") {
        await bot.sendMessage(q.from.id, "Настройки ⚙️", {
          reply_markup: {
            inline_keyboard: [
              Btn("Изменить модель", "change-model"),
              Btn("Изменить имя", "change-name"),
              Btn("Подсчет токенов", "change-count"),
            ],
          },
        });
      }

      if (q.data === "menu-2") {
        const user = await Router.manager.findOneBy(User, {
          chatId: String(q.from.id),
        });
        if (!user) return;
        if (user.usingImageGeneration) {
          user.usingImageGeneration = false;
          await Router.manager.save(user);
        }

        const assistants = await Router.manager.find(Assistant, {
          skip: 7,
          where: {},
          order: {
            id: "ASC",
          },
        });
        let result: InlineKeyboardButton[][] = [];
        for (const a of assistants) {
          result.push([
            {
              text: a.name,
              callback_data: `a-${a.id}`,
            },
          ]);
        }

        result.push(Btn("Свободный режим", "ac-asst_5oeIoYRLcSgupyUaPQF8Rp2N"));
        result.push(Btn("Предыдущая страница", "menu-1"));

        await bot.sendMessage(q.from.id, "Выберите категорию сотрудников", {
          reply_markup: {
            inline_keyboard: result,
          },
        });
      }

      if (q.data?.startsWith("aimodel-")) {
        // @ts-ignore
        const m: OpenAI.ChatModel = q.data!.substring(7);
        const user = await Router.manager.findOneBy(User, {
          chatId: String(q.from.id),
        });
        if (!user) return;
        user.model = m;
        await Router.manager.save(user);

        await bot.sendMessage(q.from.id, "Модель для генерации:", {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: `${m === "gpt-4o-mini" ? "✅" : ""} GPT 4 Omni mini`,
                  callback_data: "aimodel-gpt-4o-mini",
                },
              ],
              [
                {
                  text: `${m === "gpt-4o" ? "✅" : ""} GPT 4 Omni`,
                  callback_data: "aimodel-gpt-4o",
                },
              ],
              [
                {
                  text: `${m === "gpt-4-turbo" ? "✅" : ""} GPT 4 Turbo`,
                  callback_data: "aimodel-gpt-4-turbo",
                },
              ],
            ],
          },
        });
      }
    } catch (err) {
      Router.logger.fatal(err);
    }
  }
}
