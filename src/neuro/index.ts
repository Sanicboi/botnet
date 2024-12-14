import TelegramBot, { InlineKeyboardButton } from "node-telegram-bot-api";
import { AppDataSource } from "../data-source";
import { User } from "../entity/User";
import { Handler } from "./worker";
import OpenAI from "openai";
import pino from "pino";
import { Router } from "./router";
import { MenuRouter } from "./MenuRouter";
import { SettingsRouter } from "./SettingsRouter";
import { TextRouter } from "./TextRouter";
import { ImagesRouter } from "./ImagesRouter";
import { PaymentsRouter } from "./PaymentsRouter";
const logger = pino();

export const bot = new TelegramBot(process.env.NEURO_TOKEN ?? "", {
  polling: true,
});

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY ?? "",
});

AppDataSource.initialize();

const manager = AppDataSource.manager;

const handler = new Handler();

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
    command: "ref",
    description: "🎁Бесплатные токены ",
  },
  {
    command: "deletecontext",
    description: "🔁Перезапустить бота ",
  },
  {
    command: "settings",
    description: "⚙️Настройки ",
  },
  {
    command: "terms",
    description: "📜Условия пользования & политика",
  },
]);

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
        action: {
          threads: true
        }
      }
      
    });
    if (!user) return;
    const r = await imagesRouter.onQuery(q);
    if (!r) {
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
          action: true,
          threads: true,
        },
      });
      if (!u) return;
      const imRes = await imagesRouter.onText(msg, u);
      if (imRes) return;
      const nameRes = await settingsRouter.onText(msg, u);
      if (nameRes) return;
      await textRouter.onText(msg, u);
    }
  } catch (err) {
    logger.fatal(err);
  }
});

bot.on('photo', async msg => {
  await textRouter.onPhoto(msg);
})

