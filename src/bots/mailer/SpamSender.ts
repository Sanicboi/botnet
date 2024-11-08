import { Repository } from "typeorm";
import { Bot } from "../../entity/Bot";
import { AppDataSource } from "../../data-source";
import { User } from "../../entity/User";
import { Job, Queue, Worker } from "bullmq";
import { wait } from "../..";
import { MessageFormatter } from "../../utils/MessageFormatter";
import { Manager } from "./Manager";
import { TelegramClient } from "telegram";
import { SpamUser } from "../../entity/SpamUser";

interface ISpamInfo {
  username: string;
  bot: string;
}

export class SpamSender {
  private botRepo: Repository<Bot> = AppDataSource.getRepository(Bot);
  private userRepo: Repository<User> = AppDataSource.getRepository(User);

  private spamQueues: Queue<ISpamInfo>[] = [];
  private spamWorkers: Worker<ISpamInfo>[] = [];

  constructor(
    private clients: Map<string, TelegramClient>,
    private manager: Manager,
    private queueCount: number,
  ) {
    this.handleSpam = this.handleSpam.bind(this);
    this.sendSpam = this.sendSpam.bind(this);
    for (let i = 0; i < queueCount; i++) {
      this.spamQueues.push(
        new Queue("sp-" + i, {
          connection: {
            host: "redis",
          },
        }),
      );
      this.spamWorkers.push(
        new Worker("sp-" + i, this.handleSpam, {
          connection: {
            host: "redis",
          },
          concurrency: 1,
        }),
      );
    }
  }

  public async sendSpam() {
    const bots = await this.botRepo.find({
      where: {
        blocked: false,
      },
    });

    for (const b of bots) {
      const users = await this.userRepo
        .createQueryBuilder("user")
        .select()
        .leftJoinAndSelect("user.spam", "spam")
        .leftJoinAndSelect("user.cascade", "cascade")
        .where("spam.id IS NULL")
        .andWhere("cascade.id IS NULL")
        .getMany();
      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        user.spam = new SpamUser();
        user.spam.bot = b;
        await this.userRepo.save(user);
        this.spamQueues[b.queueIdx].add("spam", {
          username: user.usernameOrPhone,
          bot: user.spam.bot.id,
        });
      }
      await wait(0.5);
    }
  }

  private async handleSpam(job: Job<ISpamInfo>) {
    try {
      const client = this.clients.get(job.data.bot);
      if (!client) throw new Error();
      await MessageFormatter.sendTextFromFile(
        job.data.username,
        "script.txt",
        client,
      );
    } catch (e) {
      console.log(e);
    }
  }
}
