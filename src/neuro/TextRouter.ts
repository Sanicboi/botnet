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

const sizeMap = new Map<string, string>();
sizeMap.set("offer-long", "Оффер большой (70-90 слов)\n");
sizeMap.set("offer-medium", "Оффер средний (40-70 слов)\n");
sizeMap.set("offer-short", "Оффер короткий (до 40 слов)\n");

const styleMap = new Map<string, string>();
styleMap.set("style-official", "Стиль - Официальный\n");
styleMap.set("style-scientific", "Стиль - Научный\n");
styleMap.set("style-public", "Стиль - публицистический\n");
styleMap.set("style-fiction", "Стиль - художественный\n");
styleMap.set("style-informal", "Стиль - разговорный\n");
styleMap.set("style-ad", "Стиль - рекламный\n");

const toneMap = new Map<string, string>();
toneMap.set("tone-professional", "Тон - Профессиональный\n");
toneMap.set("tone-friendly", "Тон - Дружелюбный\n");
toneMap.set("tone-emotional", "Тон - эмоциональный\n");
toneMap.set("tone-ironic", "Тон - ироничный\n");
toneMap.set("tone-informative", "Тон - информативный\n");
toneMap.set("tone-inspiring", "Тон - воодушевляющий\n");
toneMap.set("tone-bold", "Тон - дерзкий\n");
toneMap.set("tone-calm", "Тон - спокойный\n");

const docTypeMap = new Map<string, string>();
docTypeMap.set("doct-agreement", "Тип документа - договор\n");
docTypeMap.set("doct-offer", "Тип документа - оферта\n");

const agreementsMap = new Map<string, string>();
agreementsMap.set(
  "agreement-legalentity",
  "Договор о создании юридического лица\n",
);
agreementsMap.set(
  "agreement-cooperation",
  "Договор о совместной деятельности\n",
);
agreementsMap.set("agreement-loan", "Договор займа\n");
agreementsMap.set("agreement-order", "Договор авторского заказа\n");
agreementsMap.set("agreement-buysell", "Договор купли продажи\n");
agreementsMap.set("agreement-service", "Договор оказания услуг\n");
agreementsMap.set("agreement-employment", "Трудовой договор\n");

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
      const user = await Router.manager.findOne(User, {
        where: {
          chatId: String(msg.chat.id),
        },
        relations: {
          threads: true,
        },
      });
      if (!user) return;
      await OpenAI.runDocument(msg, user);
    });
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

    if (q.data!.startsWith("ac-")) {
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
              Btn("Большой", "offer-long"),
              Btn("Средний", "offer-medium"),
              Btn("Маленький", "offer-short"),
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

      if (q.data!.endsWith("-voice")) {
        await bot.sendMessage(
          q.from!.id,
          "Пришлите мне голосовое сообщение, и я переведу его в текст",
        );
        u.actionId = "voice";
        await Router.manager.save(u);
        return;
      }

      await OpenAI.createThread(q, u, q.data!.substring(3));
    }

    if (q.data?.startsWith("offer-")) {
      u.offerSize = sizeMap.get(q.data!)!;
      await OpenAI.createThread(q, u, "asst_14B08GDgJphVClkmmtQYo0aq");
    }

    if (q.data?.startsWith("style-")) {
      u.textStyle = styleMap.get(q.data!)!;
      await Router.manager.save(u);
      await bot.sendMessage(q.from.id, `${u.textStyle}\nВыберите тон текста`, {
        reply_markup: {
          inline_keyboard: [
            Btn("Профессиональный", "tone-professional"),
            Btn("Дружелюбный", "tone-friendly"),
            Btn("Эмоциональный", "tone-emotional"),
            Btn("Ироничный", "tone-ironic"),
            Btn("Информативный", "tone-informative"),
            Btn("Воодушевляющий", "tone-inspiring"),
            Btn("Дерзкий", "tone-bold"),
            Btn("Спокойный / уравновешенный", "tone-calm"),
            Btn("Назад", "ac-asst_1BdIGF3mp94XvVfgS88fLIor"),
          ],
        },
      });
    }

    if (q.data?.startsWith("tone-")) {
      u.textTone = toneMap.get(q.data!)!;
      await OpenAI.createThread(q, u, "asst_1BdIGF3mp94XvVfgS88fLIor");
    }

    if (q.data?.startsWith("doct-")) {
      u.docType = docTypeMap.get(q.data!)!;
      await Router.manager.save(u);
      if (q.data === "doct-agreement") {
        await bot.sendMessage(q.from.id, "Выберите тип договора", {
          reply_markup: {
            inline_keyboard: [
              Btn(
                "Договор о создании юридического лица",
                "agreement-legalentity",
              ),
              Btn("Договор о совместной деятельности", "agreement-cooperation"),
              Btn("Договор займа", "agreement-loan"),
              Btn("Договор авторского заказа", "agreement-order"),
              Btn("Договор купли продажи", "agreement-buysell"),
              Btn("Договор оказания услуг", "agreement-service"),
              Btn("Трудовой договор", "agreement-employment"),
              Btn("Назад", "menu-1"),
            ],
          },
        });
      } else {
        u.agreementType = "Договор оферты\n";
        await Router.manager.save(u);
        await OpenAI.createThread(q, u, "asst_WHhZd8u8rXpAHADdjIwBM9CJ");
        return;
      }
      await Router.manager.save(u);
    }

    if (q.data?.startsWith("agreement-")) {
      u.agreementType = agreementsMap.get(q.data!)!;
      await OpenAI.createThread(q, u, "asst_WHhZd8u8rXpAHADdjIwBM9CJ");
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
        threads: true,
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
        threads: true,
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
        threads: true,
      },
    });
    if (!user) return;
    if (user.actionId === "voice") {
      await OpenAI.runVoice(msg, user, false);
      return;
    }
    await OpenAI.runVoice(msg, user, true);
  }
}
