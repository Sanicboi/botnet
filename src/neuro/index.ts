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
const logger = pino();

export const bot = new TelegramBot(process.env.NEURO_TOKEN ?? "", {
  polling: true,
});

interface Msg {
  role: "assistant" | "user";
  content: string;
}

interface IJob {
  userId: string;
  actionId: string;
  type: "neuro";
  task: "delete" | "create" | "run" | "image";
  model?: OpenAI.ChatModel;
  messages?: Msg[];
  id?: string;
  threadId?: string;
  prompt?: string;
}

const queue = new Queue<IJob>("openai", {
  connection: {
    host: "redis",
  },
});

const tryDeletePrevious = async (currentId: number, chatId: number) => {
  try {
    await bot.deleteMessage(chatId, currentId - 1);
  } catch (err) {
    logger.warn(err, "Error deleting message");
  }
}

AppDataSource.initialize();

const manager = AppDataSource.manager;

const handler = new Handler();

bot.setMyCommands([
  {
    command: "neuro",
    description: "Выбор профилей",
  },
  {
    command: "deletecontext",
    description: "Удалить контекст",
  },
  {
    command: "balance",
    description: "Баланс и подписка",
  },
  {
    command: "settings",
    description: "Настройки",
  },
]);
bot.onText(/\/neuro/, async (msg) => {
  try {
    await tryDeletePrevious(msg.message_id, msg.from!.id);
    const assistants = await manager.find(Assistant);
    let result: InlineKeyboardButton[][] = [];
    let u = await manager.findOneBy(User, {
      chatId: String(msg.from!.id),
    });
    if (!u) {
      u = new User();
      u.chatId = String(msg.from!.id);
      await manager.save(u);
    }
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
    logger.fatal(err);
  }
});

bot.on("callback_query", async (q) => {
  try {
    await tryDeletePrevious(q.message!.message_id + 1, q.message!.chat.id);
    if (q.data!.startsWith("a-")) {
      const actions = await manager.find(Action, {
        where: {
          assistantId: q.data!.substring(2),
        },
      });
      let result: InlineKeyboardButton[][] = [];
      for (const action of actions) {
        result.push([
          {
            text: action.name,
            callback_data: `ac-${action.id}`,
          },
        ]);
      }
      result.push([
        {
          text: "Назад",
          callback_data: 'menu'
        }
      ]);
      await bot.sendMessage(q.from.id, "Выберите функцию", {
        reply_markup: {
          inline_keyboard: result,
        },
      });
    } else if (q.data!.startsWith("ac-")) {
      if (q.data!.endsWith("-asst_1BdIGF3mp94XvVfgS88fLIor")) {

      }
      const u = await manager.findOne(User, {
        where: {
          chatId: String(q.from.id),
        },
      });
      if (!u) return;
      u.actionId = q.data!.substring(3);
      await manager.save(u);
      await queue.add("j", {
        type: "neuro",
        task: "create",
        actionId: q.data!.substring(3),
        userId: u.chatId,
        model: u.model,
      });
    } else if (q.data === "images") {
      await bot.sendMessage(q.from.id, "Выберите функцию", {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Генерация картинок",
                callback_data: "gen",
              },
            ],
            [
              {
                text: "Назад",
                callback_data: "menu"
              }
            ]
          ],
        },
      });
    } else if (q.data === "gen") {
      await bot.sendMessage(q.from.id, "Выберите разрешение", {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "1024x1024",
                callback_data: "res-1024x1024",
              },
            ],
            [
              {
                text: "1024x1792",
                callback_data: "res-1024x1792",
              },
            ],
            [
              {
                text: "1792x1024",
                callback_data: "res-1792x1024",
              },
            ],
            [
              {
                text: "Назад",
                callback_data: "images"
              }
            ]
          ],
        },
      });
    } else if (q.data?.startsWith("res-")) {
      const user = await manager.findOneBy(User, {
        chatId: String(q.from.id),
      });
      if (user) {
        user.usingImageGeneration = true;
        //@ts-ignore
        user.imageRes = q.data.substring(4);
        await manager.save(user);
        await bot.sendMessage(
          q.from.id,
          "Пришлите мне промпт, и я сгенерирую изображение",
        );
      }
    } else if (q.data === "stop-image") {
      const user = await manager.findOneBy(User, {
        chatId: String(q.from.id),
      });
      if (user) {
        user.usingImageGeneration = false;
        user.imageRes = "1024x1024";
        await manager.save(user);
        await bot.sendMessage(q.from.id, "Генерация завершена.");
      }
    } else if (q.data === "b-sub") {
      await bot.sendMessage(q.from.id, "Выберите тариф подписки", {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Lite (490₽)',
                callback_data: 'sub-lite'
              }
            ],
            [
              {
                text: 'PRO+ (790₽)',
                callback_data: 'sub-pro+'
              }
            ],
            [
              {
                text: 'Premium (1 490₽)',
                callback_data: 'sub-premium'
              }
            ],
            [
              {
                text: 'Exclusive (3 490₽)',
                callback_data: 'sub-exclusive'
              }
            ],
            [
              {
                text: 'Назад',
              }
            ]
          ]
        }
      })
    } else if (q.data === "menu") {
      const user = await manager.findOneBy(User, {
        chatId: String(q.from.id)
      });
      if (!user) return;
      if (user.usingImageGeneration) {
        user.usingImageGeneration = false;
        await manager.save(user);
      }

    const assistants = await manager.find(Assistant);
    let result: InlineKeyboardButton[][] = [];
    let u = await manager.findOneBy(User, {
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

    } else if (q.data === 'change-model') {
      await bot.sendMessage(q.from.id, 'Выберите модель', {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'GPT 4 Omni mini',
                callback_data: 'model-gpt-4o-mini'
              }
            ],
            [
              {
                text: 'GPT 4 Omni',
                callback_data: 'model-gpt-4o'
              }
            ],
            [
              {
                text: 'GPT 4 Turbo',
                callback_data: 'model-gpt-4-turbo'
              }
            ],
            [
              {
                text: 'Назад',
                callback_data: 'settings'
              }
            ]
          ]
        }
      });
    } else if (q.data?.startsWith('model-')) {
      const model = q.data.substring(6);
      const user = await manager.findOneBy(User, {
        chatId: String(q.from.id)
      });
      if (!user) return;
      //@ts-ignore
      user.model = model;
      await manager.save(user);
      await bot.sendMessage(q.from.id, 'Модель успешно изменена', {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Назад',
                callback_data: 'settings'
              }
            ]
          ]
        }
      });
    } else if (q.data === 'settings') {
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
    logger.fatal(err);
  }
});

bot.onText(/./, async (msg) => {
  try {
    // await tryDeletePrevious(msg.message_id, msg.from!.id);
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
      if (u.usingImageGeneration) {
        await queue.add("j", {
          type: "neuro",
          actionId: "image",
          task: "image",
          userId: u.chatId,
          prompt: msg.text,
        });
        return;
      }
      const t = u.threads.find((t) => t.actionId === u.actionId);
      await queue.add("j", {
        type: "neuro",
        task: "run",
        messages: [
          {
            content: msg.text!,
            role: "user",
          },
        ],
        model: u.model,
        actionId: u.actionId,
        userId: u.chatId,
        threadId: t?.id,
      });
    }
  } catch (err) {
    logger.fatal(err);
  }
});

bot.onText(/\/start/, async (msg) => {
  await tryDeletePrevious(msg.message_id, msg.from!.id);
  let user = await manager.findOneBy(User, {
    chatId: String(msg.from!.id),
  });

  if (!user) {
    user = new User();
    user.chatId = String(msg.from!.id);
    user.addBalance += 1.7;
    await manager.save(user);
  } else if (user.usingImageGeneration) {
    user.usingImageGeneration = false;
    await manager.save(user);
  }
  
  await bot.sendMessage(msg.from!.id, "Привет! На связи SmartComarde. Готов улучшить продуктивность своего бизнеса с помощью ИИ? Выбирай категорию меню ниже.");
})

bot.onText(/\/deletecontext/, async (msg) => {
  try {
    await tryDeletePrevious(msg.message_id, msg.from!.id);
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
    if (u.usingImageGeneration) {
      u.usingImageGeneration = false;
      await manager.save(u);
    }

    const t = u.threads.find((t) => t.actionId === u.actionId);

    await manager.delete(Thread, {
      id: t?.id,
    });
    await queue.add("j", {
      actionId: u.actionId,
      userId: u.chatId,
      task: "delete",
      type: "neuro",
      id: t?.id,
    });
  } catch (err) {
    logger.fatal(err);
  }
});

bot.onText(/\/balance/, async (msg) => {
  await tryDeletePrevious(msg.message_id, msg.from!.id);
  await MessageFormatter.sendTextFromFileBot(bot, "balance.txt", msg.from!.id, {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "Купить подписку",
            callback_data: "b-sub"
          }
        ],
        [
          {
            text: "Купить токены",
            callback_data: "b-tokens"
          }
        ]
      ]
    }
  });
});

bot.onText(/\/settings/, async (msg) => {
  await tryDeletePrevious(msg.message_id, msg.from!.id);
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

bot.onText(/\/free/, async (msg) => {
  await tryDeletePrevious(msg.message_id, msg.from!.id);
  await MessageFormatter.sendTextFromFileBot(bot, "free.txt", msg.from!.id);
});
