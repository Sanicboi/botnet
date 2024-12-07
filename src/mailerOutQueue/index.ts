import { Job, Worker } from "bullmq";
import { EntityManager } from "typeorm";
import { AppDataSource } from "../data-source";
import { Bot } from "../entity/bots/Bot";
import dayjs from "dayjs";
import { wait } from "../utils/wait";
import { loadSync } from "@grpc/proto-loader";
import path from "path";
import {
  loadPackageDefinition,
  ServiceDefinition,
  Client,
  credentials,
} from "@grpc/grpc-js";
import { ServiceClient } from "../accountManager/types";

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
  private manager: EntityManager = AppDataSource.manager;
  private grpc: ServiceClient;

  constructor() {
    AppDataSource.initialize().then(async () => {
      const packageDef = loadSync(
        path.join(process.cwd(), "proto", "main.proto"),
        {
          keepCase: true,
        },
      );

      // @ts-ignore
      const descriptor: {
        manager: {
          AccountManager: ServiceClient;
        };
      } = loadPackageDefinition(packageDef);

      //@ts-ignore
      this.grpc = new descriptor.manager.AccountManager(
        "accounts:50051",
        credentials.createInsecure(),
      );
      await new Promise((resolve, reject) =>
        this.grpc.waitForReady(3000000, () => resolve),
      );
      console.log(this.grpc);
    });

    this.worker = new Worker("mailer-out", this.handle.bind(this), {
      connection: {
        host: "redis",
      },
      concurrency: 1,
    });
  }

  private async handle(job: Job<IJob>) {
    console.log(job.data);
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
      // await wait(30 - d);
    }

    bot.lastSentMessage = new Date();
    this.manager.save(bot);

    this.grpc.sendMessage(
      {
        fromId: job.data.botId,
        messageText: job.data.message,
        toId: job.data.sendToId,
      },
      (err, result) => {
        console.log(err);
        if (err) return;
        console.log(result.result);
      },
    );
  }
}

try {
  const q = new Queue();
} catch (err) {
  console.log(err);
}
