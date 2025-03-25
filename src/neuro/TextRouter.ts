import TelegramBot, {
  InlineKeyboardButton,
  Message,
} from "node-telegram-bot-api";
import { Router } from "./router";
import { bot } from ".";
import { Action } from "../entity/assistants/Action";
import { User } from "../entity/User";
import { Btn } from "./utils";
import { OpenAI } from "./OpenAI";
import { AudioInput } from "./AudioInput";


/**
 * This class is used to route all the text model requests
 * @todo make all the binding code to the events the same
 */
export class TextRouter extends Router {
  /**
   * Creates a new router
   */
  constructor() {
    super();

    bot.on("document", async (msg) => {
      console.log(msg);
      const user = await Router.manager.findOne(User, {
        where: {
          chatId: String(msg.chat.id),
        },
        relations: {
          thread: {
            action: true
          },
          data: true
        },
      });
      if (!user) return;
      await OpenAI.runDocument(msg, user);
    });
    bot.on('audio', async (msg: Message) => {
      const user = await Router.manager.findOne(User, {
        where: {
          chatId: String(msg.chat.id),
        },
        relations: {
          thread: {
            action: true
          },
          data: true
        },
      });
      if (!user) return;
      await OpenAI.runVoice(msg, user, user.usingVoice, true);
    })
    bot.on("voice", async (msg) => {
      await this.onVoice(msg);
    });

    this.onQuery = this.onQuery.bind(this);
    this.onText = this.onText.bind(this);
    this.onPhoto = this.onPhoto.bind(this);
    this.onVoice = this.onVoice.bind(this);
  }

  /**
   * Callback on Callback Query
   * @param q Callback Query object
   * @returns Nothing
   */
  public async onQuery(q: TelegramBot.CallbackQuery) {
    const u = await Router.manager.findOne(User, {
      where: {
        chatId: String(q.from.id),
      },
      relations: {
        data: true,
        threads: true
      }
    });
    if (!u) return;
    if (q.data!.startsWith("a-")) {
      const actions = await Router.manager.find(Action, {
        where: {
          assistantId: q.data!.substring(2),
        },
      });
      let result: InlineKeyboardButton[][] = [];
      for (const action of actions) {
        if (action.id !== "asst_5oeIoYRLcSgupyUaPQF8Rp2N") {
          result.push([
            {
              text: action.name,
              callback_data: `ac-${action.id}`,
            },
          ]);
        }
      }
      result.push([
        {
          text: "Назад",
          callback_data: "menu-1",
        },
      ]);
      await bot.sendMessage(q.from.id, "Выберите функцию", {
        reply_markup: {
          inline_keyboard: result,
        },
      });
    }

    if (q.data?.startsWith("pt-")) {
      u.dialogueData += q.data.substring(3);
      await Router.manager.save(u);
      await bot.sendMessage(q.from.id, "Отлично, с типом определились. Теперь выбери стиль", {
        reply_markup: {
          inline_keyboard: [
            Btn("Мотивационный", "ps-Мотивационный"),
            Btn("Деловой", "ps-Деловой"),
            Btn("Экспертный", "ps-Экспертный"),
            Btn("Обучающий", "ps-Обучающий"),
            Btn("Разговорный", "ps-Разговорный"),
            Btn("Научный", "ps-Научный"),
            Btn("Рекламный", "ps-Рекламный"),
            Btn("Вызывающий", "ps-Вызывающий")
          ]
        }
      });
    }

    if (q.data?.startsWith("ps-")) {
      u.dialogueData += `Стиль поста: ${q.data.substring(3)}\n`;
      await Router.manager.save(u);
      await OpenAI.createThread(q, u, "asst_J3MtW6o63CAOy6OGjDEUUWu2");
    }

    if (q.data?.startsWith("ac-")) {
      console.log("Action");
      if (q.data!.endsWith("-asst_1BdIGF3mp94XvVfgS88fLIor")) {
        const asst = await Router.manager.findOneBy(Action, {
          id: q.data!.substring(3),
        });
        if (!asst) return;
        await bot.sendMessage(q.from!.id, asst.welcomeMessage, {
          reply_markup: {
            inline_keyboard: [
              Btn("Официальный", "style-official"),
              Btn("Научный", "style-scientific"),
              Btn("Публицистический", "style-public"),
              Btn("Художественный", "style-fiction"),
              Btn("Разговорный", "style-informal"),
              Btn("Рекламный", "style-ad"),
            ],
          },
        });
        return;
      }
      if (q.data!.endsWith("-asst_14B08GDgJphVClkmmtQYo0aq")) {
        await bot.sendMessage(q.from!.id, "Выберите размер оффера", {
          reply_markup: {
            inline_keyboard: [
              Btn("Большой (120-150 слов)", "offer-большой (70-90 слов)"),
              Btn("Средний (90-120 слов)", "offer-cредний (90-120 слов)"),
              Btn("Маленький (60-90 слов)", "offer-маленький (60-90 слов)"),
            ],
          },
        });
        return;
      }
      if (q.data!.endsWith("-asst_WHhZd8u8rXpAHADdjIwBM9CJ")) {
        await bot.sendMessage(q.from!.id, "Выберите тип документа", {
          reply_markup: {
            inline_keyboard: [
              Btn("Договор", "doct-agreement"),
              Btn("Оферта", "doct-offer"),
            ],
          },
        });
        return;
      }

      if (q.data!.endsWith("-asst_J3MtW6o63CAOy6OGjDEUUWu2")) {
        await bot.sendMessage(q.from.id, "Приветствую!👋 Я AI составитель постов. Я помогу тебе с написанием постов.\nПрежде чем написать пост, давай определимся с типом, а потом со стилем контента, выбирай по кнопкам ниже👇", {
          reply_markup: {
            inline_keyboard: [
              Btn("Информационный", "pt-informational"),
              Btn("Пользовательский", "pt-custom"),
              Btn("Полезный", "pt-helpful")
            ]
          }
        });
        return;
      }

      if (q.data!.endsWith(")) {
        await bot.sendMessage(
          q.from!.id,
          "Пришлите мне голосовое сообщение, и я переведу его в текст",
        );
        u.usingVoice = true;
        await Router.manager.save(u);
        return;
      }

      await OpenAI.createThread(q, u, q.data!.substring(3));
    }

    if (q.data?.startsWith("transcribe-")) {
      const id = q.data?.substring(11);
      const f = new AudioInput(id);
      const result = await f.transcribe(u);
      if (u.usingVoice) {
          const data = await OpenAI.setupRunCQ(q, u);
          if (!data) return;
          await OpenAI.run(q, u, data, {
            content: result,
            role: "user",
          });

        } else {
          await bot.sendMessage(q.from.id, result);
        }
    }

    if (q.data?.startsWith("offer-")) {
      u.dialogueData += `Размер оффера: ${q.data.substring(6)}\n`; 
      await Router.manager.save(u);
      await bot.sendMessage(q.from!.id, "Для создания оффера давайте определимся с моделью!\nВыбери подходящую модель по кнопке ниже 👇\nНе знаешь какую выбрать? Смотри [справку](https://docs.google.com/document/d/1785aqFyeHDYV3QjfJwpA4TC-K1UjScqRRDsQoFk7Uy8/edit)", {
        reply_markup: {
          inline_keyboard: [
            Btn("AIDA", "ot-AIDA"),
            Btn("PAS", "ot-PAS"),
            Btn("FAB", "ot-FAB"),
            Btn("4Ps", "ot-4PS"),
            Btn("Quest", "ot-QUEST"),
            Btn("ACC", "ot-ACC"),
            Btn("Смешанная", "ot-смешанная")
          ]
        },
        parse_mode: 'Markdown'
      })
      
    }

    if (q.data?.startsWith("ot-")) { // offer type
      u.dialogueData += `Модель оффера: ${q.data.substring(4)}\n`;
      await Router.manager.save(u);
      await OpenAI.createThread(q, u, "asst_14B08GDgJphVClkmmtQYo0aq");
    }

    if (q.data?.startsWith("style-")) {
      u.dialogueData += `Стиль текста: ${q.data.substring(6)}\n`;
      await Router.manager.save(u);
      await bot.sendMessage(q.from.id, `${u.dialogueData}\nВыберите тон текста`, {
        reply_markup: {
          inline_keyboard: [
            Btn("Профессиональный", "tone-Профессиональный"),
            Btn("Дружелюбный", "tone-Дружелюбный"),
            Btn("Эмоциональный", "tone-Эмоциональный"),
            Btn("Ироничный", "tone-Ироничный"),
            Btn("Информативный", "tone-Информативный"),
            Btn("Воодушевляющий", "tone-Воодушевляющий"),
            Btn("Дерзкий", "tone-Дерзкий"),
            Btn("Спокойный / уравновешенный", "tone-Спокойный"),
            Btn("Назад", "ac-asst_1BdIGF3mp94XvVfgS88fLIor"),
          ],
        },
      });
    }

    if (q.data?.startsWith("tone-")) {
      u.dialogueData += `Тон текста: ${q.data.substring(5)}\n`;
      await OpenAI.createThread(q, u, "asst_1BdIGF3mp94XvVfgS88fLIor");
    }

  }

  /**
   * Callback to process text messages
   * @param msg Message object
   * @returns Nothing
   */
  public async onText(msg: TelegramBot.Message) {
    const user = await Router.manager.findOne(User, {
      where: {
        chatId: String(msg.chat.id),
      },
      relations: {
        thread: {
          action: true
        },
        data: true
      },
    });
    if (!user) return;
    await OpenAI.runText(msg, user);
  }

  /**
   * Callback to process photos
   * @param msg Message Object
   * @returns Nothing
   */
  public async onPhoto(msg: Message) {
    const user = await Router.manager.findOne(User, {
      where: {
        chatId: String(msg.chat.id),
      },
      relations: {
        thread: {
          action: true
        },
        data: true,
      },
    });
    if (!user) return;
    await OpenAI.runPhoto(msg, user);
  }

  /**
   * Callback to process Voice Messages
   * @param msg Message Object
   * @returns Nothing
   */
  public async onVoice(msg: Message) {
    const user = await Router.manager.findOne(User, {
      where: {
        chatId: String(msg.from!.id),
      },
      relations: {
        thread: {
          action: true
        },
        data: true
      },
    });
    if (!user) return;
    if (user.usingVoice) {
      await OpenAI.runVoice(msg, user, false);
      return;
    }
    await OpenAI.runVoice(msg, user, true);
  }
}

