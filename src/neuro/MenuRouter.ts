import TelegramBot, { InlineKeyboardButton } from "node-telegram-bot-api";
import { bot } from ".";
import { Assistant } from "../entity/assistants/Assistant";
import { Router } from "./router";
import { User } from "../entity/User";
import dayjs from "dayjs";
import { MessageFormatter } from "../utils/MessageFormatter";
import { Btn } from "./utils";
import { OpenAI } from "./OpenAI";
import { wait } from "../utils/wait";
import { Thread } from "../entity/assistants/Thread";

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
        result.push(
          Btn("🤖Свободный режим", "ac-asst_5oeIoYRLcSgupyUaPQF8Rp2N"),
        );
        for (const a of assistants) {
          result.push(Btn(a.name, `a-${a.id}`));
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
        // user.addBalance = Math.round((10000 * 3.4) / 10000);
        if (refId) {
          const creator = await Router.manager.findOneBy(User, {
            chatId: refId,
          });
          if (creator) {
            if (creator.inviteCount <= 29) {
              creator.addBalance += Math.round((1000 * 3.4) / 10000);
              creator.inviteCount++;
              await Router.manager.save(creator);
              // user.addBalance += Math.round((5000 * 3.4) / 10000);
            }
          }
        }

        await Router.manager.save(user);
      }
      await Router.resetWaiters(user);

      await bot.sendMessage(
        msg.from!.id,
        "Приветствую, дорогой друг!👋\n\nSmartComrade - это многофункциональная платформа с обученными нейро-сотрудниками разных направлений!\nЗдесь мы объединили лучшее из мира нейро-сетей в одном месте.\n\nСделай свою коммуникацию с нейро-сетями профессиональной вместе с нами)\n\nИ да, не нужны никакие зарубежные карты!))\n\nНе забудь забрать афигенные полезные материалы по нейро-сетям в нашем боте помощнике! @SC_NewsBot\nА также, будем рады видеть тебя в нашем канале: https://t.me/SmartComrade1",
      );
    });

    bot.onText(/\/deletecontext/, async (msg) => {
      try {
        const threads = await Router.manager.find(Thread, {
          relations: {
            action: {
              assistant: true
            }
          },
          where: {
            userId: String(msg.from!.id)
          }
        });
        const toButtons: InlineKeyboardButton[][] = threads.map(el => Btn(`${el.action.assistant} - ${el.action.name}`, `del-${el.id}`));
        await bot.sendMessage(msg.from!.id, "Контекст и знания сотрудника!\n\nЧто это и зачем?\nНаши нейро-сотрудники самообучаемые. Чем дольше вы взаимодействуете с конкретной функцией сотрудника он запоминает какие ответы лучше выдавать, тем самым создавая уникальные и персонализированные ответы и рекомендаци.\n\nЕсли вы хотите удалить весь контекст и сделать память нейро-сотрудника в виде изначально поставленных настроек, то вы можете это сделать это ниже! 👇");
        await bot.sendMessage(msg.from!.id, "Для удаления контекста выберите сферу и функцию сотрудника:", {
          reply_markup: {
            inline_keyboard: toButtons
          }
        });
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
        `Баланс и подписка\n\n🟣 Формат доступа:\n⤷ ${user.subscription === "exclusive" ? "Exclusive" : user.subscription === "premium" ? "Premium" : user.subscription === "pro" ? "PRO+" : user.subscription === "lite" ? "Lite" : "Бесплатный доступ"}
         ⤷ Сегодня осталось: ${Math.round((user.leftForToday / 3.4) * 10000)} / ${
           user.subscription === "exclusive"
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
         ⤷ Следующий платеж: ${user.nextPayment == null ? "Нет" : user.nextPayment.toUTCString()}
      
      🟣 Ваш комплект токенов:
         ⤷ ${Math.round((user.addBalance / 3.4) * 10000)}
      
      📦 Если вам не хватает ежедневных токенов по подписке – вы можете купить комплект токенов. Комплект токенов можно использовать в любое время без лимитов. Полезно, когда вам требуется много токенов за раз.\n\nПеред покупкой комплекта токенов или подписки, настоятельно рекомендуем ознакомиться со [справкой о тарифах](https://docs.google.com/document/d/1CbyIi8h7e51B2OUEcXe85PS9FhLw8Mli7iw4o0RRCDM/edit)`,
        {
          reply_markup: {
            inline_keyboard: [
              Btn("Купить подписку", "b-sub"),
              Btn("Купить токены", "b-tokens"),
            ],
          },
          parse_mode: "Markdown",
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
      if (u.inviteCount < 30) {
        await bot.sendMessage(
          msg.from!.id,
          `💌 Вы можете пригласить других пользователей и получить Х токенов за каждого пользователя на свой баланс!
  
  - Когда новый пользователь запустит бота, вы получите бесплатные токены на свой баланс;
  - Всего вы можете пригласить 30-x пользователей (вы использовали ${u.inviteCount}/30 приглашений);
  - Пользователь должен впервые воспользоваться ботом по вашей персональной ссылке`,
        );
        await wait(10);
        await bot.sendMessage(
          msg.from!.id,
          `Привет!👋\n Я нашел крутой сервис — платформа с нейро-сотрудниками для решения и оптимизации разных задач.. 🎯 Уже пользуюсь, и реально удобно!😍\nЕсли хочешь попробовать, переходи по ссылке и запускай бота — тебе понравится! 😉\nhttps://t.me/NComrades_bot?start=${msg.from!.id}`,
        );
      } else {
        await bot.sendMessage(
          msg.from!.id,
          `К сожалению, приглашение друзей больше недоступно, так как Вы уже пригласили 30 друзей`,
        );
      }
    });

    bot.onText(/\/about/, async (msg) => {
      await MessageFormatter.sendTextFromFileBot(
        bot,
        "about-neuro.txt",
        msg.from!.id,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Подробнее о компании",
                  url: "https://drive.google.com/file/d/1oJcInZJShwd-LI4EYlAIBBgRWpEfMHlv/view?usp=drivesdk",
                },
              ],
              [
                {
                  text: "Наш канал",
                  url: "https://t.me/SmartComrade1",
                },
              ],
            ],
          },
        },
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
        {
          parse_mode: "Markdown",
        },
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
        result.push(
          Btn("🤖Свободный режим", "ac-asst_5oeIoYRLcSgupyUaPQF8Rp2N"),
        );
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

        result.push(Btn("Предыдущая страница", "menu-1"));

        await bot.sendMessage(q.from.id, "Выберите категорию сотрудников", {
          reply_markup: {
            inline_keyboard: result,
          },
        });
      }

      if (q.data?.startsWith("aimodel-")) {
        // @ts-ignore
        const m: OpenAI.ChatModel = q.data!.substring(8);
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

      if (q.data?.startsWith("del-")) {
        await OpenAI.deleteThread(q);
      }
    } catch (err) {
      Router.logger.fatal(err);
    }
  }
}
