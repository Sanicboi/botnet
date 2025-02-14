import pino from "pino";
import { bot, openai } from ".";
import { AppDataSource } from "../data-source";
import { User } from "../entity/User";
import { InlineKeyboardButton } from "node-telegram-bot-api";
import { Assistant } from "../entity/assistants/Assistant";
import OpenAI from "openai";
import { Queue } from "bullmq";
import { FileUpload } from "../entity/assistants/FileUpload";
import { Thread } from "../entity/assistants/Thread";

interface Msg {
  role: "assistant" | "user";
  content: string;
  images?: string[];
  files?: string[];
}

interface IJob {
  userId: string;
  actionId: string;
  type: "neuro";
  task: "delete" | "create" | "run" | "image" | "voice";
  model?: OpenAI.ChatModel;
  message?: Msg;
  id?: string;
  threadId?: string;
  prompt?: string;
  msgId?: string;
  voiceUrl?: string;
  generate?: boolean;
  sendResetMessage?: boolean;
}

/**
 * Helper class to create routers
 */
export class Router {
  /**
   * Database Entity Manager
   */
  public static manager = AppDataSource.manager;

  /**
   * Pino logger
   */
  public static logger = pino();

  /**
   * Reset of subscription
   * @param user User object
   */
  public static async resetSub(user: User) {
    // if (user.endDate && user.endDate <= new Date()) {
    //   user.endDate = undefined;
    //   user.subscription = "none";
    //   await this.manager.save(user);
    // }
  }

  /**
   * Try and delete previous message
   * @param currentId ID of message received right now (The message selected for deletion is this - 1)
   * @param chatId ID of chat
   */
  public static async tryDeletePrevious(currentId: number, chatId: number) {
    try {
      await bot.deleteMessage(chatId, currentId - 1);
    } catch (err) {
      this.logger.warn(err, "Error deleting message");
    }
  }

  /**
   * Resets all the waiters on the user and current dependant values
   * @param user User object 
   * @returns Nothing
   */
  public static async resetWaiters(
    user: User,
  ) {
    if (user.waitingForName) user.waitingForName = false;
    if (user.usingImageGeneration) user.usingImageGeneration = false;
    user.docType = "";
    user.agreementType = "";
    user.offerSize = "";
    user.offerType = "";
    user.textStyle = "";
    user.textTone = "";
    user.firstCryptoResponse = false;
    user.action = null;
    user.actionId = null;
    
    await Router.manager.save(user);
    // if (user.files) {
    //   for (const file of user.files) {
    //     await openai.files.del(file.id);
    //     await Router.manager.delete(FileUpload, file.id);
    //   }
    //   user.files = [];
    // }
  }

  /**
   * Empty constructor for child classes
   */
  constructor() {}
}
