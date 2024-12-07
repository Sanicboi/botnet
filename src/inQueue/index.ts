/**
 * This is the worker that processes incoming messages
 * Input: Account manager
 * Output: OpenAI queue
 * Rate limits: None
 *
 * Functionality:
 * adds multiple openai requests to the queue
 *
 *
 */

import { EntityManager } from "typeorm";
import { AppDataSource } from "../data-source";
import { Job, Queue, Worker } from "bullmq";

interface IJob {
  from: string;
  to: string;
  text: string;
}

interface IOutJob {
  type: "mailer";
  task: "create" | "reply";
  botId: string;
  toId: string;
  msg: string;
}

class InQueue {
  private manager: EntityManager = AppDataSource.manager;
  private worker: Worker<IJob>;
  private queue: Queue<IOutJob> = new Queue("openai", {
    connection: {
      host: "redis",
    },
  });

  constructor() {
    AppDataSource.initialize();

    this.worker = new Worker("in", this.handle.bind(this), {
      connection: {
        host: "redis",
      },
    });
  }

  private async handle(job: Job<IJob>) {
    await this.queue.add("j", {
      task: "reply",
      botId: job.data.to,
      msg: job.data.text,
      toId: job.data.from,
      type: "mailer",
    });
  }
}

const q = new InQueue();
