import TelegramBot, { InlineKeyboardButton } from "node-telegram-bot-api";
import { Router } from "./router";
import { bot } from ".";
import { Action } from "../entity/assistants/Action";
import { User } from "../entity/User";
import { openai } from ".";
import { Stream } from "stream";
import { FileUpload } from "../entity/assistants/FileUpload";

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
        await Router.queue.add("j", {
          type: "neuro",
          task: "run-file",
          model: u.model,
          actionId: u.actionId,
          userId: u.chatId,
          threadId: t?.id,
          fileId: f2.id
        });
      }
    });

    this.onQuery = this.onQuery.bind(this);
    this.onText = this.onText.bind(this);
  }

  public async onQuery(q: TelegramBot.CallbackQuery) {
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
      }
      const u = await Router.manager.findOne(User, {
        where: {
          chatId: String(q.from.id),
        },
      });
      if (!u) return;
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
  }

  public async onText(msg: TelegramBot.Message, user: User) {
    const t = user.threads.find((t) => t.actionId === user.actionId);
    await Router.queue.add("j", {
      type: "neuro",
      task: "run",
      messages: [
        {
          content: msg.text!,
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
