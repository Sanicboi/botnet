import { Job, Worker } from "bullmq";
import { EntityManager } from "typeorm";
import { AppDataSource } from "../data-source";
import { Bot } from "../entity/bots/Bot";
import dayjs from "dayjs";
import { wait } from "../utils/wait";

/**
 * This is the worker that controls message sending procedure.
 * Input: OpenAI Queue
 * Output: Account Manager & DB
 * Rate limits: Standard Telegram limits (Smart)
 *
 * Functionality:
 * Handles bot initial messages and AI responses. Has a smart rate limiting system
 * that only applies the limit when necessary.
 *
 *
 */

interface IJob {
  botId: string;
  message: string;
  sendToId: string;
}

class Queue {
  private worker: Worker;
  private static manager: EntityManager = AppDataSource.manager;

  constructor() {
    AppDataSource.initialize();
    this.worker = new Worker("mailer-out", Queue.handle.bind(this), {
      connection: {
        host: "redis",
      },
      concurrency: 1,
    });
  }

  private static async handle(job: Job<IJob>) {
    const bot = await this.manager.findOneBy(Bot, {
      token: job.data.botId,
    });
    if (!bot) return;

    if (!bot.lastSentMessage) {
      bot.lastSentMessage = new Date();
    }
    const now = dayjs();
    const d = now.diff(dayjs(bot.lastSentMessage), "s");
    if (d <= 30) {
      await wait(30 - d);
    }

    bot.lastSentMessage = new Date();
    this.manager.save(bot);
  }
}

const q = new Queue();
