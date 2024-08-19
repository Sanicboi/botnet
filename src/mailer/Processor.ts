import { Job, Queue, Worker } from "bullmq";
import { Bot } from "../entity/Bot";
import { User } from "../entity/User";
import { TelegramClient } from "telegram";
import OpenAI from "openai";
import { DataSource, Repository } from "typeorm";
import { UnknownError } from "../utils/Errors";
import TelegramBot from "node-telegram-bot-api";
import { Sender } from "./Sender";

interface IProcessingTask {
  bot: Bot;
  user: User;
}

const startMessage =
  "Приветствую, я являюсь сооснователем бизнес клуба. Хочу с Вами познакомиться и  понять по каким вопросам к Вам можно обращаться? Мы ищем интересные проекты в которые можно инвестировать, предпринимателей и экспертов для партнерства. Готовы направить к Вам нашу аудиторию в качестве клиентов. Видел Вас в нескольких чатах сообществ в телеграмм группах. Если требуется могу прислать информацию о нас.";

export class Processor {
  private worker: Worker<IProcessingTask>;
  private queue: Queue<IProcessingTask>;
  private userRepo: Repository<User>;

  constructor(
    private clients: Map<string, TelegramClient>,
    private openai: OpenAI,
    private src: DataSource,
    private reporter: TelegramBot,
    private sender: Sender
  ) {
    this.userRepo = src.getRepository(User);
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
      const res = await this.openai.chat.completions.create({
        messages: [
          {
            role: "user",
            content: `ТЕБЯ ЗОВУТ ${
              (
                await client!.getMe()
              ).firstName
            }. Если у тебя женское имя, напиши от него. Перепиши синонимично это сообщение, заменив 15 слов синонимами, но сохранив мысль: ${startMessage}`,
          },
        ],
        model: "gpt-4o-mini",
        temperature: 1,
      });
      const thread = await this.openai.beta.threads.create({
        messages: [
          {
            content: res.choices[0].message.content!,
            role: "assistant",
          },
        ],
      });
      const user = await this.userRepo.findOneBy({
        usernameOrPhone: job.data.user.usernameOrPhone,
      });

      if (!user)
        throw new UnknownError(
          "User is NULL",
          "Processing queue",
          this.reporter
        );

      user.threadId = thread.id;
      user.botid = job.data.bot.id;
      await this.userRepo.save(user);

      await this.sender.add(job.data.bot.queueIdx, {
        bot: job.data.bot.id,
        text: res.choices[0].message.content!,
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
