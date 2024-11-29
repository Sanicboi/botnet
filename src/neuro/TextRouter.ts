import TelegramBot, { InlineKeyboardButton } from "node-telegram-bot-api";
import { Router } from "./router";
import { bot } from ".";
import { Action } from "../entity/assistants/Action";
import { User } from "../entity/User";
import { openai } from ".";
import { FileUpload } from "../entity/assistants/FileUpload";

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
          callback_data: "menu",
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
        await bot.sendMessage(q.from!.id, "Выберите стиль текста", {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Официальный",
                  callback_data: "style-official",
                },
              ],
              [
                {
                  text: "Научный",
                  callback_data: "style-scientific",
                },
              ],
              [
                {
                  text: "Публицистический",
                  callback_data: "style-public",
                },
              ],
              [
                {
                  text: "Художественный",
                  callback_data: "style-fiction",
                },
              ],
              [
                {
                  text: "Разговорный",
                  callback_data: "style-informal",
                },
              ],
              [
                {
                  text: "Рекламный",
                  callback_data: "style-ad",
                },
              ],
            ],
          },
        });
      }
      if (q.data!.endsWith("-asst_14B08GDgJphVClkmmtQYo0aq")) {
        await bot.sendMessage(q.from!.id, "Выберите размер оффера", {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Большой",
                  callback_data: "offer-long",
                },
              ],
              [
                {
                  text: "Средний",
                  callback_data: "offer-medium",
                },
              ],
              [
                {
                  text: "Маленький",
                  callback_data: "offer-short",
                },
              ],
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
        actionId: q.data!.substring(3),
        userId: u.chatId,
        model: u.model,
      });
    }

    if (q.data?.startsWith("style-")) {
      u.textStyle = styleMap.get(q.data!)!;
      await Router.manager.save(u);
    }
  }

  public async onText(msg: TelegramBot.Message, user: User) {
    const t = user.threads.find((t) => t.actionId === user.actionId);
    const res = msg.text! + user.textStyle + user.textTone + user.offerSize;
    user.textStyle = "";
    user.textTone = "";
    user.offerSize = "";
    await Router.manager.save(user);
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
