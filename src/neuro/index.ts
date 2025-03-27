import TelegramBot, { InlineKeyboardButton } from "node-telegram-bot-api";
import { AppDataSource } from "../data-source";
import { User } from "../entity/User";
import OpenAI from "openai";
import pino from "pino";
import { Router } from "./router";
import { MenuRouter } from "./MenuRouter";
import { SettingsRouter } from "./SettingsRouter";
import { TextRouter } from "./TextRouter";
import { ImagesRouter } from "./ImagesRouter";
import { PaymentsRouter } from "./PaymentsRouter";
import { PromoCode } from "../entity/assistants/Promo";
import { UserPromo } from "../entity/assistants/UserPromo";
import { OutputBotFormatter } from "./output/formatter";
import { AdditionalInfo } from "../entity/assistants/AdditionalInfo";
const logger = pino();

export const bot = new TelegramBot(process.env.NEURO_TOKEN ?? "", {
  polling: true,
});

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY ?? "",
});

AppDataSource.initialize();

const manager = AppDataSource.manager;

bot.setMyCommands([
  {
    command: "about",
    description: "🤝О нас (SmartComrade)",
  },
  {
    command: "help",
    description: "🤖О боте (справка)",
  },
  {
    command: "neuro",
    description: "🧠Нейро-сотрудники",
  },
  {
    command: "balance",
    description: "💳Баланс & подписка",
  },
  {
    command: "data",
    description: "🧠Данные о себе"
  },
  {
    command: "ref",
    description: "🏅Реферальная программа",
  },
  {
    command: "free",
    description: "🎁Бесплатные токены",
  },
  {
    command: "deletecontext",
    description: "🔁Контекст и знания AI-сотрудника",
  },
  {
    command: "settings",
    description: "⚙️Настройки",
  },
  {
    command: "terms",
    description: "📜Условия использования & политика",
  },
]);
export const formatter = new OutputBotFormatter(bot);
const menuRouter = new MenuRouter();
const settingsRouter = new SettingsRouter();
const textRouter = new TextRouter();
const imagesRouter = new ImagesRouter();
const paymentsRouter = new PaymentsRouter();

bot.on("callback_query", async (q) => {
  try {
    await Router.tryDeletePrevious(
      q.message!.message_id + 1,
      q.message!.chat.id,
    );
    const user = await manager.findOne(User, {
      where: {
        chatId: String(q.from.id),
      },
      relations: {
      },
    });
    if (!user) return;
    const reset = await imagesRouter.onQuery(q, user);
    if (reset) {
      await Router.resetWaiters(user);
    }
    await Router.resetSub(user);
    await textRouter.onQuery(q);
    await paymentsRouter.onQuery(q);

    await menuRouter.onCallback(q);
    await settingsRouter.onCallback(q);
  } catch (err) {
    logger.fatal(err);
  }
});

bot.onText(/./, async (msg) => {
  try {
    if (!msg.text!.startsWith("/")) {
      const u = await manager.findOne(User, {
        where: {
          chatId: String(msg.from!.id),
        },
        relations: {
          threads: true,
          data: true
        },
      });
      if (!u) return;
      if (u.waitingForPromo) {
        u.waitingForPromo = false;
        const promo = await manager.findOne(PromoCode, {
          where: {
            name: msg.text,
          },
          relations: {
            userPromos: true,
          },
        });

        if (!promo) {
          await bot.sendMessage(msg.from!.id, "❌Упс! Что-то пошло не так. Убедитесь, что промокод введен правильно и попробуйте еще раз. ❗️Важно: один и тот же промокод нельзя активировать несколько раз");
        } else {
          if (promo.expiresAt < new Date()) {
            await bot.sendMessage(
              msg.from!.id,
              "Кажется, вы не успели(. Данный промокод уже истек.",
            );
          } else if (promo.limit <= promo.userPromos.length) {
            await bot.sendMessage(
              msg.from!.id,
              "Кажется, вы не успели(. Количество пользователей, активировавших этот промокод, превысило лимит.",
            );
          } else if (
            promo.userPromos.findIndex(
              (el) => el.userId === String(msg.from!.id),
            ) >= 0
          ) {
            await bot.sendMessage(
              msg.from!.id,
              "Кажется, вы уже ввели этот промокод.",
            );
          } else {
            const uPromo = new UserPromo();
            uPromo.promoId = promo.name;
            uPromo.promo = promo;
            uPromo.userId = u.chatId;
            uPromo.user = u;
            await manager.save(uPromo);
            u.addBalance += promo.amount;
            await bot.sendMessage(
              msg.from!.id,
              "Промокод успешно активирован!",
            );
          }
        }

        await manager.save(u);
        return;
      }

      if (u.waitingForData != '') {
        const idx = u.data.findIndex(el => el.assistantId === u.waitingForData);
        if (idx !== -1) {
          // Edit the current
          u.waitingForData = '';
          await Router.manager.save(u);
          u.data[idx].text = msg.text!;
          await Router.manager.save(u.data[idx]);
        } else {
          const info = new AdditionalInfo();
          info.userId = u.chatId;
          info.assistantId = u.waitingForData;
          info.text = msg.text!;
          u.waitingForData = '';
          await Router.manager.save(u);
          await Router.manager.save(info);
        }
        
        await bot.sendMessage(msg.from!.id, 'Данные успешно добавлены 💫');
        return;
      }

      const imRes = await imagesRouter.onText(msg, u);
      if (imRes) return;
      const nameRes = await settingsRouter.onText(msg, u);
      if (nameRes) return;
      await textRouter.onText(msg);
    }
  } catch (err) {
    logger.fatal(err);
  }
});

bot.on("photo", async (msg) => {
  await textRouter.onPhoto(msg);
});

bot.onText(/\/free/, async (msg) => {
  const u =  await manager.findOne(User, {
    where: {
      chatId: String(msg.from!.id),
    },
  });
  if (!u) return;
  u.waitingForPromo = true;
  await manager.save(u);
  await bot.sendMessage(
    msg.from!.id,
    `Приветствую, ${msg.from?.first_name}! 

В этом разделе ты можешь активировать промокод и забрать подарки от команды SmartComrade 🎁

Для активации промокода, напиши кодовое слово в ответном сообщении. 

❗️Важно: при активации автоматически доступен промокод START на 7000 токенов.`,
  );
});
