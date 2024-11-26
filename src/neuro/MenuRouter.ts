import TelegramBot, { InlineKeyboardButton } from "node-telegram-bot-api";
import { bot } from ".";
import { Assistant } from "../entity/assistants/Assistant";
import { Router } from "./router";
import { User } from "../entity/User";
import { Thread } from "../entity/assistants/Thread";
import dayjs from "dayjs";
import { MessageFormatter } from "../utils/MessageFormatter";

export class MenuRouter extends Router {
  constructor() {
    super();
    bot.onText(/\/neuro/, async (msg) => {
      try {
        const assistants = await Router.manager.find(Assistant);
        let result: InlineKeyboardButton[][] = [];
        let u = await Router.manager.findOneBy(User, {
          chatId: String(msg.from!.id),
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

        result.push([
          {
            text: "Дизайн и генерация картинок",
            callback_data: "images",
          },
        ]);

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
        const refId = msg.text!.split(' ')[1];
        user = new User();
        user.chatId = String(msg.from!.id);
        user.addBalance = Math.round(10000*34/10000);
        if (refId) {
          const creator = await Router.manager.findOneBy(User, {
            chatId: refId
          });
          if (creator) {
            creator.addBalance += Math.round(3000*34/10000);
            await Router.manager.save(creator);
            user.addBalance += Math.round(5000*34/10000);
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
        const u = await Router.manager.findOne(User, {
          where: {
            chatId: String(msg.from!.id),
          },
          relations: {
            action: true,
            threads: true,
          },
        });
        if (!u) return;
        await Router.resetWaiters(u);

        const t = u.threads.find((t) => t.actionId === u.actionId);

        await Router.manager.delete(Thread, {
          id: t?.id,
        });
        await Router.queue.add("j", {
          actionId: u.actionId,
          userId: u.chatId,
          task: "delete",
          type: "neuro",
          id: t?.id,
        });
      } catch (err) {
        Router.logger.fatal(err);
      }
    });

    bot.onText(/\/balance/, async (msg) => {
      const user = await Router.manager.findOneBy(User, {
        chatId: String(msg.from!.id),
      });
      if (!user) return;
      const now = dayjs();
      await Router.resetSub(user);
      await Router.resetWaiters(user);
      await bot.sendMessage(
        msg.from!.id,
        `Баланс и подписка\n\n🟣 Формат доступа:\n⤷ ${user.subscription === "exlusive" ? "Exclusive" : user.subscription === "premium" ? "Premium" : user.subscription === "pro" ? "PRO+" : user.subscription === "lite" ? "Lite" : "Бесплатный доступ"}
         ⤷ Сегодня осталось: ${Math.round((user.leftForToday / 34) * 10000)} / ${
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
         ⤷ Новое пополнение через: ${user.subscription === "none" ? "Нет" : 24 - now.hour()}:${59 - now.minute()}
         ⤷ Следующий платеж: ${user.endDate == null ? "Нет" : user.endDate.toUTCString()}
      
      🟣 Ваш комплект токенов:
         ⤷ ${Math.round((user.addBalance / 34) * 10000)}
      
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
        chatId: String(msg.from!.id)
      });
      if (!u) return;
      await bot.sendMessage(msg.from!.id, `Пригласите друзей и получите 3000 токенов! Ваша реферальная ссылка: https://t.me/NComrades_bot?start=${msg.from!.id}`);
    });

    bot.onText(/\/about/, async (msg) => {
      await MessageFormatter.sendTextFromFileBot(bot, 'guide.txt', msg.from!.id);
    });

    this.onCallback = this.onCallback.bind(this);
  }

  public async onCallback(q: TelegramBot.CallbackQuery) {
    try {
      if (q.data === "menu") {
        const user = await Router.manager.findOneBy(User, {
          chatId: String(q.from.id),
        });
        if (!user) return;
        if (user.usingImageGeneration) {
          user.usingImageGeneration = false;
          await Router.manager.save(user);
        }

        const assistants = await Router.manager.find(Assistant);
        let result: InlineKeyboardButton[][] = [];
        let u = await Router.manager.findOneBy(User, {
          chatId: String(q.from.id),
        });
        for (const a of assistants) {
          result.push([
            {
              text: a.name,
              callback_data: `a-${a.id}`,
            },
          ]);
        }

        result.push([
          {
            text: "Дизайн и генерация картинок",
            callback_data: "images",
          },
        ]);

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
      }
    } catch (err) {
      Router.logger.fatal(err);
    }
  }
}
