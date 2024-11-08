import { TelegramClient } from "telegram";
import { Repository } from "typeorm";
import { Bot } from "../../entity/Bot";
import { AppDataSource } from "../../data-source";
import { Job, Queue, Worker } from "bullmq";

interface IJob {
  from: string;
  to: string;
  msg: string;
}

export class CrossMailer {
  private queue: Queue<IJob> = new Queue<IJob>("heat", {
    connection: {
      host: "redis",
    },
  });

  private worker: Worker<IJob>;

  private msgsOne: string[] = [
    "Привет",
    "Здравствуйте",
    "Как дела?",
    "Добрый день",
  ];

  private msgsTwo: string[] = [
    "Привет",
    "Хорошо, а у тебя?",
    "Спасибо",
    "Удачи",
  ];

  private repo: Repository<Bot> = AppDataSource.getRepository(Bot);

  constructor(private clients: Map<string, TelegramClient>) {
    this.worker = new Worker("heat", this.onJob.bind(this), {
      limiter: {
        duration: 60000,
        max: 1,
      },
      connection: {
        host: "redis",
      },
    });
  }

  private async onJob(job: Job<IJob>) {
    const client = this.clients.get(job.data.from)!;
    const rec = this.clients.get(job.data.to)!;
    const recP = await rec.getMe();
    await client.sendMessage(recP.username!, {
      message: job.data.msg,
    });
  }

  public async onHeat() {
    const bots = await this.repo.find({
      where: {
        blocked: false,
      },
    });

    for (const bot of bots) {
      console.log("Bot iter");
      const other = bots.filter((el) => el.id !== bot.id);
      for (let i = 0; i < 5; i++) {
        const rnd = Math.round(Math.random() * 3);
        await this.queue.add("one", {
          from: bot.id,
          to: other[i].id,
          msg: this.msgsOne[rnd],
        });
        await this.queue.add("two", {
          to: bot.id,
          from: other[i].id,
          msg: this.msgsTwo[rnd],
        });
      }
    }
  }
}
