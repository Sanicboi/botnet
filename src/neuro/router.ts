import pino from "pino";
import { bot } from ".";
import { AppDataSource } from "../data-source";
import { User } from "../entity/User";
import { InlineKeyboardButton } from "node-telegram-bot-api";
import { Assistant } from "../entity/assistants/Assistant";
import OpenAI from "openai";
import { Queue } from "bullmq";

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

export class Router {
  protected static manager = AppDataSource.manager;
  protected static logger = pino();
  protected static queue = new Queue<IJob>("openai", {
    connection: {
      host: "redis",
    },
  });

  public static async resetSub(user: User) {
    if (user.endDate && user.endDate <= new Date()) {
      user.endDate = undefined;
      user.subscription = "none";
      await this.manager.save(user);
    }
  }

  public static async tryDeletePrevious(currentId: number, chatId: number) {
    try {
      await bot.deleteMessage(chatId, currentId - 1);
    } catch (err) {
      this.logger.warn(err, "Error deleting message");
    }
  }

  public static async resetWaiters(user: User) {
    if (user.waitingForName) user.waitingForName = false;
    if (user.usingImageGeneration) user.usingImageGeneration = false;
    if (user.action) {
      await Router.queue.add("j", {
        actionId: user.action.id,
        task: "delete",
        type: "neuro",
        userId: user.chatId,
        id: user.action.threads.find((el) => el.userId == user.chatId)!.id,
      });
    }
  }

  constructor() {}
}