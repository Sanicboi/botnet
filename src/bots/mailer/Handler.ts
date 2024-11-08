import { Job, Queue, Worker } from "bullmq";
import { Api, TelegramClient } from "telegram";
import { NewMessageEvent } from "telegram/events";
import { Bot } from "../../entity/Bot";
import { Repository } from "typeorm";
import { User } from "../../entity/User";
import { AppDataSource } from "../../data-source";
import { UnknownError } from "../../utils/Errors";
import TelegramBot from "node-telegram-bot-api";
import { Manager } from "./Manager";
import { wait } from "../..";
import { Assistant, IData } from "../Assistant";
import { Sender } from "./Sender";

interface IIncomingTask {
  bot: string;
  userId: string;
  text: string;
}

export class Handler {
  private queue: Queue<IIncomingTask> = new Queue<IIncomingTask>("in", {
    connection: {
      host: "redis",
    },
  });

  private worker: Worker<IIncomingTask>;
  private userRepo: Repository<User> = AppDataSource.getRepository(User);
  private botRepo: Repository<Bot> = AppDataSource.getRepository(Bot);

  constructor(
    private clients: Map<string, TelegramClient>,
    private reporter: TelegramBot,
    private manager: Manager,
    private assistant: Assistant,
    private sender: Sender,
  ) {
    this.add = this.add.bind(this);
    this.onRequiresAction = this.onRequiresAction.bind(this);
    this.handle = this.handle.bind(this);

    this.worker = new Worker("in", this.handle, {
      connection: {
        host: "redis",
      },
      concurrency: 1,
    });
  }

  private async handle(job: Job<IIncomingTask>) {
    const client = this.clients.get(job.data.bot);
    try {
      const dialogs = await client!.getDialogs();
      const cl = dialogs.find((el) => {
        return (
          el.entity!.className === "User" &&
          el.entity!.id.toString() === job.data.userId
        );
      });
      if (!cl) return;
      const username = cl.entity as Api.User;
      const user = await this.userRepo.findOne({
        where: {
          usernameOrPhone: username.username,
        },
        relations: {
          cascade: true,
          spam: true,
        },
      });
      const b = await this.botRepo.findOne({
        where: {
          id: job.data.bot,
        },
      });
      if (!user) {
        throw new UnknownError("User is NULL", "Incoming queue", this.reporter);
      }
      if (!b) {
        throw new UnknownError("Bot is NULL", "Incoming queue", this.reporter);
      }
      if (user.cascade && !user.cascade.replied) {
        //await this.manager.reportToAnquets(`Получен ответ (каскад) от клиента ${user.usernameOrPhone}`);
        user.cascade.replied = true;
      }

      if (user.spam && !user.spam.replied) {
        //await this.manager.reportToAnquets(`Получен ответ (спам) от клиента ${user.usernameOrPhone}`);
        user.spam.replied = true;
      }

      await this.userRepo.save(user);
      await client!.invoke(
        new Api.messages.ReadHistory({
          maxId: 0,
          peer: user.usernameOrPhone,
        }),
      );
      await wait(7);
      await client!.invoke(
        new Api.messages.SetTyping({
          peer: user.usernameOrPhone,
          action: new Api.SendMessageTypingAction(),
        }),
      );

      const phone = (await client!.getMe()).phone;
      const messages = await this.assistant.answerMessage(
        job.data.text,
        user,
        b,
        this.onRequiresAction,
      );
      for (const m of messages) {
        await this.sender.add(b.queueIdx, {
          bot: b.id,
          text: m,
          user: user.usernameOrPhone,
          first: false,
        });
      }
    } catch (error) {
      console.error("ERROR PROCESSING MESSAGE " + error);
    }
  }

  public async add(e: NewMessageEvent, bot: Bot) {
    const client = this.clients.get(bot.id);
    await this.queue.add("incoming", {
      bot: bot.id,
      text: e.message.text,
      userId: e.message.senderId!.toJSON(),
    });
  }

  private async onRequiresAction(
    msg: string,
    user: User,
    bot: Bot,
    data: IData,
  ) {
    user.cascade.finished = true;
    await this.userRepo.save(user);
    //await this.manager.reportToAnquets(`Согласована встреча с клиентом. Номер телефона бота: ${bot.phone}\nКлиент:${user.usernameOrPhone}`);
  }
}
