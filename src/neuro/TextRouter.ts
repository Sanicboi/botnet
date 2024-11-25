import TelegramBot, { InlineKeyboardButton } from "node-telegram-bot-api";
import { Router } from "./router";
import { bot } from ".";
import { Action } from "../entity/assistants/Action";
import { User } from "../entity/User";

export class TextRouter extends Router {
  constructor() {
    super();

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
