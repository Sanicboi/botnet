import TelegramBot, { InlineKeyboardButton, Message } from "node-telegram-bot-api";
import { MessageFormatter } from "../utils/MessageFormatter";
import pino from "pino";
import { AppDataSource } from "../data-source";
import { Client } from "../entity/Client";

const logger = pino();
const bot = new TelegramBot(process.env.SMARTCOMRADE_TOKEN ?? "", {
  polling: true,
});

AppDataSource.initialize();

bot
  .setMyCommands([
    {
      description: "Больше о нас (SmartComrade)",
      command: "about",
    },
    {
      description: "Готовые AI решения",
      command: "products",
    },
    {
      description: "Нейро-сотрудники",
      command: "aiproducts"
    },
    {
      description: "Наши социальные сети",
      command: "social",
    },
    {
      description: "Подарки и бесплатные материалы",
      command: "presents",
    },
    {
      description: "Запись на стратегическую сессию",
      command: "session",
    },
    {
      description: "Партнерская программа",
      command: "partnership",
    },
    {
      description: "Доступ к GPT",
      command: "gpt",
    },
    {
      description: "Поддержка",
      command: "support",
    },
  ])
  .catch((err) => console.log(err));

bot.onText(/\/start/, async (msg) => {
  if (!msg.from) return;
  let user = await AppDataSource.getRepository(Client).findOneBy({
    chatId: String(msg.from!.id),
  });
  if (!user) {
    const user = new Client();
    user.chatId = String(msg.from!.id);
    await AppDataSource.getRepository(Client).save(user);
  }
  await bot.sendMessage(
    msg.from.id,
    `Привет, ${msg.from.username ?? msg.from.first_name}`,
  );
  await MessageFormatter.sendImageFromFileBot('chris.jpg', bot, msg.from!.id, `Меня зовут Крис.🚀\nЯ AI менеджер компании SmartComarde.\nЯ буду Вашим проводником в мир AI технологий🧬\n\nКак показывает практика:  Внедрение AI-оптимизации в бизнес, способно увеличить эффективность метрик и показателей более чем на 40%.\n\nВыбирайте категорию меню ниже))\n\nP.S. Не забудьте забрать бесплатные материалы, которые будут полезны уже сейчас 🎁`);
});

bot.onText(/\/about/, async (msg) => {
  await MessageFormatter.sendTextFromFileBot(bot, "about.txt", msg.from!.id);
});

bot.onText(/\/products/, async (msg) => {
  try {
    await MessageFormatter.sendImageFromFileBot(
      "products.jpg",
      bot,
      msg.from!.id,
      MessageFormatter.readTextFromFile("products.txt"),
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Лидогенерация и маркетинг",
                callback_data: "leadgen",
              },
            ],
            [
              {
                text: "SMM и брендинг",
                callback_data: "smm",
              },
            ],
            [
              {
                text: "Маркетплейсы",
                callback_data: "mp",
              },
            ],
            [
              {
                text: "Оптимизация продаж",
                callback_data: "sales",
              },
            ],
            [
              {
                text: 'Создай своего нейро-сотрудника',
                callback_data: 'create'
              }
            ],
            [
                {
                    text: 'Другое',
                    callback_data: 'other'
                }
            ],

          ],
        },
      },
    );
  } catch (error) {
    logger.fatal(error);
  }
});

bot.on("callback_query", async (q) => {
  let caption = "";

  switch (q.data) {
    case "mp":   
    case "create":
    case "leadgen":
    case "sales":
    case "smm":  
    case "call":
    case "attorney":
    case "programmes":
    case "copywriting":
    case "session":
    case "other":
    case "question":
      await MessageFormatter.sendTextFromFileBot(bot, q.data + ".txt", q.from.id, q.data == 'other' ? {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Ответить на вопросы',
                callback_data: 'question'
              }
            ]
          ]
        }
      } : undefined);
      if (q.data == 'question') {
        const user = await AppDataSource.getRepository(Client).findOneBy({
          chatId: String(q.from.id)
        });
        if (user) {
          user.qt = 'a';
          await AppDataSource.getRepository(Client).save(user);
        }
      }
      return;
    
    case "check":
      try {
        // const u = await bot.getChatMember(+(process.env.PROMO ?? ''), q.from.id);
        // if (!u) throw new Error();
        await MessageFormatter.sendTextFromFileBot(bot, "check.txt", q.from.id);
      } catch (error) {
        await bot.sendMessage(
          q.from.id,
          "Не вижу твоей подписки. Подпишись, чтобы получить материалы!)",
        );
      }
  }
  await MessageFormatter.sendImageFromFileBot(
    "products.jpg",
    bot,
    q.from.id,
    MessageFormatter.readTextFromFile(caption),
    {
      reply_markup:
        q.data === "leadgen"
          ? {
              inline_keyboard: [
                [
                  {
                    text: "Назначить звонок",
                    callback_data: "call",
                  },
                ],
              ],
            }
          : undefined,
    },
  );
});


bot.onText(/\/social/, async (msg) => {
  await MessageFormatter.sendTextFromFileBot(bot, "social.txt", msg.from!.id);
});

bot.onText(/\/presents/, async (msg) => {
  await MessageFormatter.sendTextFromFileBot(
    bot,
    "presents.txt",
    msg.from!.id,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Канал",
              url: "https://google.com",
            },
          ],
          [
            {
              text: "Проверить подписку",
              callback_data: "check",
            },
          ],
        ],
      },
    },
  );
});

bot.onText(/\/gpt/, async (msg) => {
  await MessageFormatter.sendTextFromFileBot(bot, "gpt.txt", msg.from!.id);
});

bot.onText(/\/support/, async (msg) => {
  await MessageFormatter.sendTextFromFileBot(bot, "support.txt", msg.from!.id);
});

bot.onText(/\/partnership/, async (msg) => {
  await MessageFormatter.sendTextFromFileBot(
    bot,
    "partnership.txt",
    msg.from!.id,
  );
});

bot.onText(/./, async (msg) => {
  if (!msg.text!.startsWith("/")) {
    const user = await AppDataSource.getRepository(Client).findOneBy({
      chatId: String(msg.from!.id),
    });
    if (user) {
      const map1 = new Map<
        "s" | "l" | "d" | "a" | "o" | "n",
        Exclude<keyof Client, "chatId" | "qt">
      >();
      const map2 = new Map<"s" | "l" | "d" | "a" | "o" | "n", string>();
      const map3 = new Map<
        "s" | "l" | "d" | "a" | "o" | "n",
        "s" | "l" | "d" | "a" | "o" | "n"
      >();
      map1.set("s", "sphere");
      map1.set("l", "leads");
      map1.set("d", "callDate");
      map1.set("a", "sphere");
      map1.set("o", "optimize");
      map2.set(
        "s",
        "Отлично! Как сейчас обстоят дела с заявками? Сколько привлекаете?",
      );
      map2.set("l", "Зафиксировал! Когда вам будет удобно созвониться?");
      map2.set(
        "d",
        "Супер, остаемся на связи. Напишем вам в ближайшее время))",
      );
      map2.set(
        "a",
        "Отлично! Какую сферу Вы бы хотели оптимизировать при помощи нейро-сетей?",
      );
      map2.set("o", "Зафиксировал! Когда вам будет удобно созвониться?");
      map3.set("s", "l");
      map3.set("l", "d");
      map3.set("a", "o");
      map3.set("o", "d");
      map3.set("d", "n");

      if (map1.has(user.qt)) {
        const idx = map1.get(user.qt);
        user[idx!] = msg.text!;
        await bot.sendMessage(msg.from!.id, map2.get(user.qt)!);
        user.qt = map3.get(user.qt)!;
        await AppDataSource.getRepository(Client).save(user);
      }
    }
  }
});


bot.onText(/\/aiproducts/, async (msg: Message) => {
  // await bot.sendMessage(msg.from!.id, 'Чтобы мне дать максимально конструктивный ответ, укажите категорию оптимизации:', {
  //   reply_markup: {
  //     inline_keyboard: [
  //       [
  //         {
  //           text: 'Юр услуги',
  //           callback_data: 'attorney'
  //         }
  //       ],
  //       [
  //         {
  //           text: 'Курация онлайн программ',
  //           callback_data: 'programmes'
  //         }
  //       ],
  //       [
  //         {
  //           text: 'Копирайтнг',
  //           callback_data: 'copywriting'
  //         }
  //       ],
  //       [
  //         {
  //           text: 'Другое',
  //           callback_data: 'other'
  //         }
  //       ]
  //     ]
  //   }
  // });
  await MessageFormatter.sendTextFromFileBot(bot, 'aiproducts.txt', msg.from!.id);
})