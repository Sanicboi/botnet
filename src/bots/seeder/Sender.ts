import { Job, Queue, Worker } from "bullmq";
import { TelegramClient } from "telegram";
import { Bot } from "../../entity/Bot";
import { Chat } from "../../entity/Chat";

export interface IChatData {
  chatId: string;
  msg: string;
  botId: string;
}

export class Sender {
  private queue: Queue<IChatData> = new Queue("seeder", {
    connection: {
      host: "redis",
    },
  });
  private worker: Worker<IChatData> = new Worker<IChatData>(
    "seeder",
    this.onJob.bind(this),
    {
      connection: {
        host: "redis",
      },
      concurrency: 1,
      limiter: {
        duration: 30000,
        max: 1,
      },
    },
  );

  constructor(private clients: Map<string, TelegramClient>) {}

  private async onJob(job: Job<IChatData>) {
    const client = this.clients.get(job.data.botId);
    await client?.sendMessage(+job.data.chatId, {
      message: job.data.msg,
    });
  }

  public async send(bot: Bot, message: string, chat: Chat) {
    if (bot.chats.findIndex((el) => el.id === chat.id) >= 0) {
      await this.queue.add("send", {
        botId: bot.id,
        chatId: chat.id,
        msg: message,
      });
    }
  }
}
