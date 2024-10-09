import { Job, Queue, Worker } from "bullmq";
import { Bot } from "../entity/Bot";
import { User } from "../entity/User";
import { TelegramClient } from "telegram";
import OpenAI from "openai";
import { DataSource, Repository } from "typeorm";
import { UnknownError } from "../utils/Errors";
import TelegramBot from "node-telegram-bot-api";
import { Sender } from "./Sender";
import { AppDataSource } from "../data-source";
import { CascadeUser } from "../entity/CascadeUser";
import { Randomiser } from "./Randomiser";

interface IProcessingTask {
  bot: Bot;
  user: User;
}

const startMessage =
  "Привет) \nВремени мало, поэтому давай кратко и по сути.\nЯ Григорий, компания SmartComrade.\n\nСмотри, я ничего не впариваю.\nЗнаю, что ты сильный эксперт, поэтому есть интересный концепт, которым хочу поделиться.\n\nЕсть эксклюзивная история - ИИ оптимизация с использованием нейро-сотрудников. Мы разработали эту история по себе зная как много времени, сил и денег уходит на запуски, привлечение клиентов и лидогенерацию.\n\nПоследние кейсы дали такую вкусную статистику:\n— Системы автоматической лидогенерации принесли клиенту 1500 потенциальных клиентов за 4 недели,по цене 5 руб/лид. То есть до 200 лидов ежедневно. Без непосредственного участия в процессе.\n— Нейро-SMM менеджер SmartComrade привлекает более 100 целевых подписчиков ежедневно в каналы заказчиков, с ценой подписчика от 1 до 3 руб.\nЕсли упрощать, то ИИ сотрудник позволяет экономить: время, деньги, силы и нервы!\nв наше время ресурсы крайне ценные👀\n\nОбещал кратко, поэтому подробнее предлагаю выйти на созвон. Мне потребуется всего 30 минут, чтобы все рассказать и помочь наконец найти свободное время\n\nКогда будет удобно созвониться?";

export class Processor {
  private worker: Worker<IProcessingTask>;
  private queue: Queue<IProcessingTask>;
  private userRepo: Repository<User>;

  constructor(
    private clients: Map<string, TelegramClient>,
    private openai: OpenAI,
    private reporter: TelegramBot,
    private sender: Sender
  ) {
    this.userRepo = AppDataSource.getRepository(User);
    this.handler = this.handler.bind(this);
    this.process = this.process.bind(this);
    this.queue = new Queue('proc', {
        connection: {
            host: 'redis'
        }
    });
    this.worker = new Worker('proc', this.handler, {
        connection: {
            host: 'redis'
        },
        limiter: {
            max: 300,
            duration: 60000,
          },
        concurrency: 10
    })
  }

  private async handler(job: Job<IProcessingTask>) {
    try {
      const client = this.clients.get(job.data.bot.id);
      const result = await Randomiser.randomise(startMessage, (await client!.getMe()).firstName!)
      const thread = await this.openai.beta.threads.create({
        messages: [
          {
            content: result,
            role: "assistant",
          },
        ],
      });
      const user = await this.userRepo.findOne({
        where: {
          usernameOrPhone: job.data.user.usernameOrPhone,
        },
        relations: {
          cascade: true
        }
      });

      if (!user)
        throw new UnknownError(
          "User is NULL",
          "Processing queue",
          this.reporter
        );
      user.cascade = new CascadeUser();
      user.cascade.threadId = thread.id;
      user.cascade.bot = job.data.bot;
      await this.userRepo.save(user);
      await this.sender.add(job.data.bot.queueIdx, {
        bot: job.data.bot.id,
        text: result,
        user: job.data.user.usernameOrPhone,
        first: true,
      });
    } catch (e) {
      console.log(e);
    }
  }

  public async process(bot: Bot, user: User) {
    await this.queue.add("process", {
        bot,
        user
    });
  }
}
