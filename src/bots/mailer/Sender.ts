import { Job, Queue, Worker } from "bullmq";
import { Manager } from "./Manager";
import { TelegramClient } from "telegram";
import { Message } from "../../entity/Message";
import { DataSource, Repository } from "typeorm";
import { Bot } from "../../entity/Bot";
import { UnknownError } from "../../utils/Errors";
import TelegramBot from "node-telegram-bot-api";
import { AppDataSource } from "../../data-source";
import { wait } from "../..";

interface IOutcomingTask {
  bot: string;
  text: string;
  user: string;
  first?: boolean;
}

export class Sender {
  private outQueues: Queue<IOutcomingTask>[] = [];
  private outWorkers: Worker<IOutcomingTask>[] = [];
  private msgRepo: Repository<Message> = AppDataSource.getRepository(Message);
  private botRepo: Repository<Bot> = AppDataSource.getRepository(Bot);

  constructor(
    private queueCount: number,
    private manager: Manager,
    private clients: Map<string, TelegramClient>,
    private reporter: TelegramBot,
  ) {
    this.handler = this.handler.bind(this);
    this.add = this.add.bind(this);

    for (let i = 0; i < this.queueCount; i++) {
      this.outQueues.push(
        new Queue("out" + i, {
          connection: {
            host: "redis",
          },
        }),
      );

      this.outWorkers.push(
        new Worker("out" + i, this.handler, {
          connection: {
            host: "redis",
          },
          concurrency: 1,
          limiter: {
            duration: 60000 * 1,
            max: 1,
          },
        }),
      );
    }
  }

  private async handler(job: Job<IOutcomingTask>) {
    if (job.data.first) {
      await wait(Math.random() * 60 * 4);
    }
    const client = this.clients.get(job.data.bot);
    job.data.text = job.data.text.replaceAll(/【.+】/g, "").replaceAll("#", "");
    try {
      const m = new Message();
      m.botphone = job.data.bot;
      m.text = job.data.text;
      m.username = job.data.user;
      await this.msgRepo.save(m);
      await client!.sendMessage(job.data.user, {
        message: job.data.text,
      });
      //await this.manager.reportToLogs(
      //  `Отправлено сообщение. От: ${m.botphone}. К: ${m.username}`
      //);
      if (job.data.first) {
        const obj = await this.botRepo.findOneBy({
          id: job.data.bot,
        });
        if (!obj)
          throw new UnknownError("Bot IS NULL", "OutQueue", this.reporter);
        obj.sentMsgs++;
        await this.botRepo.save(obj);
      }
    } catch (error) {
      console.error("ERROR SENDING MESSAGE ", error);
    }
  }

  public async add(idx: number, data: IOutcomingTask) {
    await this.outQueues[idx].add("send", data);
  }
}
