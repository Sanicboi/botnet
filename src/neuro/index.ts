import TelegramBot, { InlineKeyboardButton } from "node-telegram-bot-api";
import { AppDataSource } from "../data-source";
import { Assistant } from "../entity/assistants/Assistant";
import { Action } from "../entity/assistants/Action";
import { User } from "../entity/User";
import { Queue } from "bullmq";
import { Thread } from "../entity/assistants/Thread";
import { Handler } from "./worker";
import { MessageFormatter } from "../utils/MessageFormatter";
import OpenAI from "openai";
import pino from "pino";
import dayjs from "dayjs";
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
    command: "neuro",
    description: "Выбор профилей",
  },
  {
    command: "balance",
    description: "Баланс и подписка",
  },
  {
    command: "settings",
    description: "Настройки",
  },
  {
    command: "about",
    description: "О нас",
  },
  {
    command: 'ref',
    description: 'Получить бесплатные токены'
  },
  {
    command: "deletecontext",
    description: "Удалить диалог и перезапустить бота",
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
    const user = await manager.findOneBy(User, {
      chatId: String(q.from.id),
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

// bot.onText(/\/free/, async (msg) => {
//   await tryDeletePrevious(msg.message_id, msg.from!.id);
//   await MessageFormatter.sendTextFromFileBot(bot, "free.txt", msg.from!.id);
// });
