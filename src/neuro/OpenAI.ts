import { User } from "../entity/User";
import { CallbackQuery, Message } from "node-telegram-bot-api";
import { Router } from "./router";
import { bot } from ".";
import { Btn } from "./utils";
import { Thread } from "../entity/assistants/Thread";

interface IRunData {
  prompt: string;
  thread: Thread;
}

/**
 * This class is a helper class that makes it easy to validate and use the OpneAI Queue
 */

export class OpenAI {
  /**
   * Add a create thread job to the queue
   * @param q Callback Query object
   * @param u User object
   * @param actId Action ID
   * @returns Nothing
   */
  public static async createThread(q: CallbackQuery, u: User, actId: string) {
    u.actionId = actId;
    await Router.manager.save(u);
    await Router.queue.add("j", {
      type: "neuro",
      task: "create",
      actionId: actId,
      userId: u.chatId,
      model: u.model,
    });
  }

  /**
   * Internal method to get the necessary data for the run
   * @param msg Message object
   * @param u User (expecting a user with Threads fetched)
   * @returns false if can't run, otherwise data of the run
   */
  private static async setupRun(
    msg: Message,
    u: User,
  ): Promise<false | IRunData> {
    const t = u.threads.find((t) => t.actionId === u.actionId);
    if (!t) return false;
    const res =
      (msg.text ?? "") +
      "\n" +
      u.textStyle +
      u.textTone +
      u.offerSize +
      u.docType +
      u.agreementType;
    u.textStyle = "";
    u.textTone = "";
    u.offerSize = "";
    u.docType = "";
    u.agreementType = "";
    await Router.manager.save(u);

    if (u.addBalance === 0 && u.leftForToday === 0) {
      await bot.sendMessage(msg.from!.id, "У вас недостатчно токенов", {
        reply_markup: {
          inline_keyboard: [
            Btn("Купить пакет токенов", "b-tokens"),
            Btn("Купить подписку", "b-sub"),
          ],
        },
      });
      return false;
    }
    await bot.sendMessage(msg.from!.id, "генерирую ответ ✨...");
    return {
      thread: t,
      prompt: res,
    };
  }

  /**
   * This method runs the model on text message
   * @param msg Message object
   * @param u User (Threads fetched)
   * @returns Nothing
   */
  public static async runText(msg: Message, u: User) {
    const data = await this.setupRun(msg, u);
    if (!data) return;

    await Router.queue.add("j", {
      type: "neuro",
      task: "run",
      message: { content: data.prompt, role: "user" },
      model: u.model,
      actionId: u.actionId!,
      userId: u.chatId,
      threadId: data.thread.id,
    });
  }

  /**
   * This method runs the model on voice message
   * @param msg Message object
   * @param u User (Threads fetched)
   * @returns Nothing
   */
  public static async runVoice(msg: Message, u: User) {
    const data = await this.setupRun(msg, u);
    if (!data) return;

    if (!msg.voice) return;

    const url = await bot.getFileLink(msg.voice.file_id);
    console.log(url);
    await Router.queue.add("j", {
      type: "neuro",
      task: "voice",
      actionId: u.actionId!,
      userId: u.chatId,
      model: u.model,
      voiceUrl: url,
      threadId: data.thread.id,
      generate: true
    });
  }

  /**
   * This method runs the model on photo message
   * @param msg Message object
   * @param u User (Threads fetched)
   * @returns Nothing
   */
  public static async runPhoto(msg: Message, u: User) {
    const data = await this.setupRun(msg, u);
    if (!data) return;

    if (!msg.photo) return;

    const photo = msg.photo.sort((a, b) => b.file_size! - a.file_size!)[0];
    const url = await bot.getFileLink(photo.file_id);

    await Router.queue.add("j", {
      type: "neuro",
      task: "run",
      message: {
        content: data.prompt || "Входные данные",
        role: "user",
        images: [url],
      },
      model: u.model,
      actionId: u.actionId!,
      userId: u.chatId,
      threadId: data.thread.id,
    });
  }

  /**
   * This method runs the model on document message
   * @param msg Message object
   * @param u User (Threads fetched)
   * @returns Nothing
   */
  public static async runDocument(msg: Message, u: User) {
    const data = await this.setupRun(msg, u);
    if (!data) return;

    if (!msg.document) return;

    const url = await bot.getFileLink(msg.document.file_id);

    await Router.queue.add("j", {
      type: "neuro",
      task: "run",
      message: {
        content: data.prompt || "Входные данные",
        role: "user",
        files: [url],
      },
      model: u.model,
      actionId: u.actionId!,
      userId: u.chatId,
      threadId: data.thread.id,
    });
  }

  /**
   * This method resets the context
   * @param msg Message object
   * @returns Nothing
   */
  public static async deleteThread(msg: Message) {
    const u = await Router.manager.findOne(User, {
      where: {
        chatId: String(msg.from!.id),
      },
      relations: {
        action: {
          threads: true,
        },
      },
    });
    if (!u) return;
    if (u.actionId === 'voice') {
      u.actionId = null;
      u.action = null;
      await Router.manager.save(u);
      await bot.sendMessage(msg.from!.id, 'Транскрибация закончена. Выберите другую функцию');
      return;
    }
    await Router.resetWaiters(u);
  }

  public static async runJustVoice(msg: Message) {
    if (!msg.voice) return;

    const url = await bot.getFileLink(msg.voice.file_id);

    await Router.queue.add('j', {
      actionId: 'voice',
      generate: false,
      task: 'voice',
      type: 'neuro',
      userId: String(msg.from!.id),
      voiceUrl: url,
      msgId: String(msg.message_id),
    })
  }
}
