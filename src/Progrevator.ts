import TelegramBot from "node-telegram-bot-api";
import { AppDataSource } from "./data-source";
import { Chat } from "./entity/Chat";
import { Repository } from "typeorm";
import { ChatMsg } from "./entity/ChatMsg";
import { Job, Queue, Worker } from "bullmq";
import { Thread } from "./entity/Thread";
import OpenAI from "openai";
import { InvalidInputError, UnknownError } from "./utils/Errors";
import { TelegramCLientManager } from "./TelegramClientManager";
import { Bot } from "./entity/Bot";
import cron from "node-cron";

interface IInQueueJobData {
  msg: ChatMsg;
  username: string;
  chat: Chat;
}

interface IOutQueueJobData {
  bot: Bot;
  chatId: string;
  thread: Thread;
}

export class Progrevator {
  private manager: TelegramBot = new TelegramBot(
    process.env.PROGREV_TG_TOKEN ?? "",
    {
      polling: true,
    }
  );
  private chatRepo: Repository<Chat> = AppDataSource.getRepository(Chat);
  private msgRepo: Repository<ChatMsg> = AppDataSource.getRepository(ChatMsg);
  private threadRepo: Repository<Thread> = AppDataSource.getRepository(Thread);
  private botRepo: Repository<Bot> = AppDataSource.getRepository(Bot);
  private inQueue: Queue<IInQueueJobData> = new Queue("p-in", {
    connection: {
      host: "redis",
    },
  });
  private outQueue: Queue<IOutQueueJobData> = new Queue("p-out", {
    connection: {
      host: "redis",
    },
  });

  constructor(
    private openai: OpenAI,
    private reporter: TelegramBot,
    private clients: TelegramCLientManager
  ) {
    this.manager.onText(/./, this.onTextMessage);
    this.manager.onText(/\/set/, this.onSet);
    this.manager.onText(/\/on/, this.onOn);
    this.manager.onText(/\/off/, this.onOff);
    this.manager.onText(/\/restart/, this.onRestart);
    this.manager.onText(/\/chat/, this.onChat);
    cron.schedule("*/4 * * * *", this.onCronExecution);
  }

  private onTextMessage = async (msg: TelegramBot.Message): Promise<void> => {
    try {
      const chat = await this.chatRepo.findOne({
        where: {
          id: String(msg.chat.id),
        },
      });
      if (chat && chat.listen) {
        const message = new ChatMsg();
        message.chatid = String(msg.chat.id);
        message.text = msg.text!;
        message.from = String(msg.from!.id);
        message.handled = false;
        await this.msgRepo.save(message);
        console.log(msg);
        await this.inQueue.add("handle", {
          msg: message,
          username: `Имя пользователя: ${msg.from!.username}, Имя: ${
            msg.from!.first_name
          }`,
          chat,
        });
      }
    } catch (e) {
      console.log(e);
    }
  };

  private inQueueHandler = async (job: Job<IInQueueJobData>): Promise<void> => {
    const threads = await this.threadRepo
      .createQueryBuilder("thread")
      .select()
      .leftJoinAndSelect("thread.bot", "bot")
      .leftJoinAndSelect("thread.chat", "chat")
      .where("chat.id = :id", {
        id: job.data.msg.chatid,
      })
      .getMany();
    try {
      for (const thread of threads) {
        try {
          if (job.data.msg.from === thread.bot.from) continue;
          await this.openai.beta.threads.messages.create(thread.id, {
            role: "user",
            content: job.data.username + ": " + job.data.msg.text,
          });
        } catch (e) {
          console.log("ERR " + e);
        }
      }
      const msg = await this.msgRepo.findOne({
        where: {
          id: job.data.msg.id,
        },
      });
      if (!msg)
        throw new UnknownError("Msg is NULL", "inQueueHandler", this.reporter);
      msg.queued = true;
      await this.msgRepo.save(msg);
    } catch (e) {
      console.log(e);
    }
  };

  private outQueueHandler = async (
    job: Job<IOutQueueJobData>
  ): Promise<void> => {
    try {
      console.log("Out job");
      const client = this.clients.getClient(job.data.bot.id);
      const me = await client.getMe();
      const msgs = await this.openai.beta.threads.runs
        .stream(job.data.thread.id, {
          assistant_id: "asst_NcMJnXsqlSLzGWj7SBgz56at",
          additional_instructions: `Ты пишешь с аккаунта ${me.username} (${me.firstName})`,
        })
        .finalMessages();
      await AppDataSource.createQueryBuilder()
        .update(ChatMsg)
        .where("handled = false")
        .andWhere("queued = true")
        .andWhere("chatid = :id", {
          id: job.data.chatId,
        })
        .set({
          handled: true,
        })
        .execute();
      for (const m of msgs) {
        await client.sendMessage(job.data.chatId, {
          //@ts-ignore
          message: m.content[0].text.value
            .replaceAll(/【.+】/g, "")
            .replaceAll("#", ""),
        });
        await new Promise((resolve, reject) => setTimeout(resolve, 1000));
      }
      const b = await this.botRepo.findOneBy({ id: job.data.bot.id });
      if (!b)
        throw new UnknownError(
          "Bot not found",
          "OutQueueHandler",
          this.reporter
        );
      b.quota--;
      await this.botRepo.save(b);
    } catch (err) {
      console.log(err);
    }
  };

  private onCronExecution = async (): Promise<void> => {
    const chats = await this.chatRepo.find({
      where: {
        listen: true,
      },
    });
    for (const chat of chats) {
      const msgs = await this.msgRepo.find({
        where: {
          handled: false,
          chatid: chat.id,
          queued: true,
        },
        order: {
          createdAt: {
            direction: "DESC",
          },
        },
      });

      if (msgs.length > 0) {
        const threads = await this.threadRepo.find({
          where: {
            chat: chat,
          },
          relations: {
            bot: true,
            chat: true,
          },
        });
        const eligible = threads
          .filter((el) => el.bot.from != msgs[0].from)
          .filter((el) => el.bot.quota > 0);
        const i = Math.round(Math.random() * (eligible.length - 1));
        const t = eligible[i];
        await this.outQueue.add("send", {
          bot: t.bot,
          chatId: chat.id,
          thread: t,
        });
      }
    }
  };

  private onSet = async (msg: TelegramBot.Message): Promise<void> => {
    try {
      const bots = await this.botRepo.find({
        where: {
          blocked: false,
          progrevat: true,
        },
      });
      for (const bot of bots) {
        const client = this.clients.getClient(bot.id);
        bot.from = (await client.getMe()).id.toString();
        await this.botRepo.save(bot);
      }
    } catch (e) {}
  };

  private onOn = async (msg: TelegramBot.Message): Promise<void> => {
    const bots = await this.botRepo.find({
      where: {
        blocked: false,
        progrevat: true,
      },
    });
    await this.chatRepo
      .createQueryBuilder("chat")
      .update()
      .where("chat.id = :id", {
        id: msg.text!.split(" ")[1],
      })
      .set({
        listen: true,
      })
      .execute();
    bots.forEach(async (bot) => {
      const thread = new Thread();
      thread.bot = bot;
      thread.chat = (await this.chatRepo.findOne({
        where: {
          id: msg.text!.split(" ")[1],
        },
      }))!;
      thread.id = (
        await this.openai.beta.threads.create({
          messages: [],
        })
      ).id;
      await this.threadRepo.save(thread);
    });
  };

  private onOff = async (msg: TelegramBot.Message): Promise<void> => {
    const id = msg.text!.split(" ")[1];
    await this.chatRepo
      .createQueryBuilder("chat")
      .update()
      .where("chat.id = :id", {
        id: msg.text!.split(" ")[1],
      })
      .set({
        listen: false,
      })
      .execute();
    const chat = await this.chatRepo.findOneBy({ id });
    if (!chat) throw new InvalidInputError("Chat not found", this.reporter);
    try {
      const threads = await this.threadRepo.find({
        where: {
          chat,
        },
        relations: {
          bot: true,
        },
      });
      for (const t of threads) {
        await this.openai.beta.threads.del(t.id);
      }
      await this.threadRepo
        .createQueryBuilder("thread")
        .delete()
        .where("thread.id IN (:...ids)", {
          ids: threads.map((el) => el.id),
        })
        .execute();
      await this.msgRepo
        .createQueryBuilder()
        .update()
        .where("handled = false")
        .andWhere("chatid = :id", {
          id,
        })
        .set({
          handled: true,
        })
        .execute();
    } catch (e) {}
  };

  private onRestart = async (msg: TelegramBot.Message): Promise<void> => {
    await this.botRepo
      .createQueryBuilder("bot")
      .update()
      .set({
        quota: 3,
      })
      .execute();
  };

  private onChat = async (msg: TelegramBot.Message): Promise<void> => {
    const id = msg.text!.split(" ")[1];
    const chat = new Chat();
    chat.listen = false;
    chat.id = id;
    await this.chatRepo.save(chat);
  };

  private inWorker: Worker<IInQueueJobData> = new Worker(
    "p-in",
    this.inQueueHandler
  );
  private outWorker: Worker<IOutQueueJobData> = new Worker(
    "p-out",
    this.outQueueHandler
  );
}
