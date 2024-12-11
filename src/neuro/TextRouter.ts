import TelegramBot, { InlineKeyboardButton } from "node-telegram-bot-api";
import { Router } from "./router";
import { bot } from ".";
import { Action } from "../entity/assistants/Action";
import { User } from "../entity/User";
import { openai } from ".";
import { FileUpload } from "../entity/assistants/FileUpload";
import { Btn } from "./utils";

const sizeMap = new Map<string, string>();
sizeMap.set("offer-long", "Оффер большой (70-90 слов)\n");
sizeMap.set("offer-medium", "Оффер средний (40-70 слов)\n");
sizeMap.set("offer-short", "Оффер короткий (до 40 слов)\n");

const styleMap = new Map<string, string>();
styleMap.set("style-official", "стиль - Официальный\n");
styleMap.set("style-scientific", "стиль - Научный\n");
styleMap.set("style-public", "стиль - публицистический\n");
styleMap.set("style-fiction", "стиль - художественный\n");
styleMap.set("style-informal", "стиль - разговорный\n");
styleMap.set("style-ad", "стиль - рекламный\n");

const toneMap = new Map<string, string>();
toneMap.set("tone-professional", "тон - Профессиональный\n");
toneMap.set("tone-friendly", "тон - Дружелюбный\n");
toneMap.set("tone-emotional", "тон - эмоциональный\n");
toneMap.set("tone-ironic", "тон - ироничный\n");
toneMap.set("tone-informative", "тон - информативный\n");
toneMap.set("tone-inspiring", "тон - воодушевляющий\n");
toneMap.set("tone-bold", "тон - дерзкий\n");
toneMap.set("tone-calm", "тон - спокойный\n");

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
export class TextRouter extends Router {
  constructor() {
    super();

    bot.on("document", async (msg) => {
      const u = await Router.manager.findOne(User, {
        where: { chatId: String(msg.chat.id) },
        relations: {
          action: true,
          threads: true,
        },
      });
      if (!u) return;

      if (msg.document) {
        const str = bot.getFileStream(msg.document.file_id);
        const arr = await str.toArray();
        const f = new File(arr, msg.document.file_name!, {
          type: msg.document.mime_type,
        });

        const res = await openai.files.create({
          purpose: "assistants",
          file: f,
        });

        const f2 = new FileUpload();
        f2.id = res.id;
        f2.user = u;
        await Router.manager.save(f2);

        const t = u.threads.find((t) => t.actionId === u.actionId);
        await bot.sendMessage(msg.from!.id, "генерирую ответ ✨...");
        await Router.queue.add("j", {
          type: "neuro",
          task: "run-file",
          model: u.model,
          actionId: u.actionId,
          userId: u.chatId,
          threadId: t?.id,
          fileId: f2.id,
          id: String(msg.message_id),
          msgId: String(msg.message_id),
        });
      }
    });

    this.onQuery = this.onQuery.bind(this);
    this.onText = this.onText.bind(this);
  }

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
      if (q.data!.endsWith("-asst_1BdIGF3mp94XvVfgS88fLIor")) {
        const asst = await Router.manager.findOneBy(Action, {
          id: q.data!.substring(3)
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

      u.actionId = q.data!.substring(3);
      await Router.manager.save(u);
      await Router.queue.add("j", {
        type: "neuro",
        task: "create",
        actionId: q.data!.substring(3),
        userId: u.chatId,
        model: u.model,
      });
    }

    if (q.data?.startsWith("offer-")) {
      u.actionId = "asst_14B08GDgJphVClkmmtQYo0aq";
      u.offerSize = sizeMap.get(q.data!)!;
      await Router.manager.save(u);
      await Router.queue.add("j", {
        type: "neuro",
        task: "create",
        actionId: "asst_14B08GDgJphVClkmmtQYo0aq",
        userId: u.chatId,
        model: u.model,
      });
    }

    if (q.data?.startsWith("style-")) {
      u.textStyle = styleMap.get(q.data!)!;
      await Router.manager.save(u);
      await bot.sendMessage(q.from.id, "Выберите тон текста", {
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
      u.actionId = "asst_1BdIGF3mp94XvVfgS88fLIor";
      await Router.manager.save(u);
      await Router.queue.add("j", {
        type: "neuro",
        task: "create",
        actionId: "asst_1BdIGF3mp94XvVfgS88fLIor",
        userId: u.chatId,
        model: u.model,
      });
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
            ],
          },
        });
      } else {
        u.actionId = "asst_WHhZd8u8rXpAHADdjIwBM9CJ";
        await Router.manager.save(u);
        await Router.queue.add("j", {
          type: "neuro",
          task: "create",
          actionId: "asst_WHhZd8u8rXpAHADdjIwBM9CJ",
          userId: u.chatId,
          model: u.model,
        });
        return;
      }
      await Router.manager.save(u);
    }

    if (q.data?.startsWith("agreement-")) {
      u.agreementType = agreementsMap.get(q.data!)!;
      u.actionId = "asst_WHhZd8u8rXpAHADdjIwBM9CJ";
      await Router.manager.save(u);
      await Router.queue.add("j", {
        type: "neuro",
        task: "create",
        actionId: "asst_WHhZd8u8rXpAHADdjIwBM9CJ",
        userId: u.chatId,
        model: u.model,
      });
    }
  }

  public async onText(msg: TelegramBot.Message, user: User) {
    const t = user.threads.find((t) => t.actionId === user.actionId);
    const res =
      msg.text! +
      "\n" +
      user.textStyle +
      user.textTone +
      user.offerSize +
      user.docType +
      user.agreementType;
    user.textStyle = "";
    user.textTone = "";
    user.offerSize = "";
    user.docType = "";
    user.agreementType = "";
    await Router.manager.save(user);
    if (user.addBalance === 0 && user.leftForToday === 0) {
      await bot.sendMessage(msg.from!.id, "У вас недостатчно токенов", {
        reply_markup: {
          inline_keyboard: [
            Btn("Купить пакет токенов", "b-tokens"),
            Btn("Купить подписку", "b-sub"),
          ],
        },
      });
      return;
    }
    await Router.queue.add("j", {
      type: "neuro",
      task: "run",
      messages: [
        {
          content: res,
          role: "user",
        },
      ],
      model: user.model,
      actionId: user.actionId,
      userId: user.chatId,
      threadId: t?.id,
    });
  }
}
