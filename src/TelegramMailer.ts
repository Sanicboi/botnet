import TelegramBot from "node-telegram-bot-api";
import OpenAI from "openai";
import { IsNull, Repository } from "typeorm";
import { Bot } from "./entity/Bot";
import { AppDataSource } from "./data-source";
import { User } from "./entity/User";
import { TelegramCLientManager } from "./TelegramClientManager";
import { Job, Queue, Worker } from "bullmq";
import { InvalidInputError, UnknownError } from "./utils/Errors";
import { Message } from "./entity/Message";
import { Api } from "telegram";
import { Bitrix } from "./Bitrix";
import { Assistant, IData } from "./Assistant";
import { wait } from ".";

interface IProcessingTask {
  bot: Bot;
  user: User;
}

interface IOutcomingTask {
  bot: string;
  text: string;
  user: string;
  first?: boolean;
}

interface IIncomingTask {
  bot: string;
  userId: string;
  text: string;
}

const startMessage =
  "Приветствую, я являюсь сооснователем бизнес клуба. Хочу с Вами познакомиться и  понять по каким вопросам к Вам можно обращаться? Мы ищем интересные проекты в которые можно инвестировать, предпринимателей и экспертов для партнерства. Готовы направить к Вам нашу аудиторию в качестве клиентов. Видел Вас в нескольких чатах сообществ в телеграмм группах. Если требуется могу прислать информацию о нас.";
const startMessage2 =
  "Приветствую, я являюсь менеджером бизнес клуба. Хочу с Вами познакомиться и понять по каким вопросам к Вам можно обращаться? Мы ищем интересные проекты в которые можно инвестировать, предпринимателей и экспертов для партнерства. Готовы направить к Вам нашу аудиторию в качестве клиентов. Видела Вас в нескольких чатах сообществ в телеграмм группах. Если требуется могу прислать информацию о нас.";
export class TelegramMailer {
  private botRepo: Repository<Bot> = AppDataSource.getRepository(Bot);
  private userRepo: Repository<User> = AppDataSource.getRepository(User);
  private msgRepo: Repository<Message> = AppDataSource.getRepository(Message);
  private processingQueue: Queue<IProcessingTask> = new Queue("proc", {
    connection: {
      host: "redis",
    },
  });
  private outQueues: Queue<IOutcomingTask>[] = [];
  private outWorkers: Worker<IOutcomingTask>[] = [];
  private manager: TelegramBot = new TelegramBot(
    process.env.MAILER_TG_TOKEN ?? "",
    {
      polling: true,
    }
  );

  constructor(
    private openai: OpenAI,
    private clients: TelegramCLientManager,
    private reporter: TelegramBot,
    private assistant: Assistant,
    private queueCount: number = 50
  ) {
    this.manager.onText(/\/start/, this.onStart);
    this.manager.onText(/\/send/, this.onSend);
    this.manager.onText(/\/reset/, this.onReset);
    this.manager.onText(/\/log/, this.onLog);
    this.manager.onText(/\/write/, this.onWrite);
    for (let i = 0; i < queueCount; i++) {
      this.outQueues.push(new Queue("out" + i));
      this.outWorkers.push(new Worker("out" + i, this.onOut));
    }
  }

  private onSend = async (msg: TelegramBot.Message): Promise<void> => {
    const nBots = await this.botRepo.find({
      where: {
        blocked: false,
        send: true,
      },
    });
    const notTalked = await this.userRepo.find({
      where: {
        botid: IsNull(),
        finished: false,
      },
    });
    let free = notTalked.length;
    let total = 0;
    for (let i = 0; i < nBots.length; i++) {
      const bot = nBots[i];
      const client = this.clients.getClient(bot.id);
      let currentCount = 0;
      const toSend = 25;
      bot.queueIdx = i % this.queueCount;
      await this.botRepo.save(bot);
      while (currentCount <= toSend && free > 0) {
        try {
          await this.processingQueue.add("gen", {
            user: notTalked[total],
            bot: bot,
          });
          free--;
          total++;
          currentCount++;
        } catch (err) {
          console.log("ERROR STARTING", err);
          await this.manager.sendMessage(
            2074310819,
            "Error adding to processing queue: " + err
          );
        }
      }
    }
  };

  private onProcessing = async (job: Job<IProcessingTask>): Promise<void> => {
    try {
      const client = this.clients.getClient(job.data.bot.id);
      const res = await this.openai.chat.completions.create({
        messages: [
          {
            role: "user",
            content: `ТЕБЯ ЗОВУТ ${
              (
                await client.getMe()
              ).firstName
            }. Перепиши синонимично это сообщение, изменив слова и порядок абзацев (замени как минимум 15 слов синонимами), но сохранив мысль: ${
              job.data.bot.gender === "male" ? startMessage : startMessage2
            }`,
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
      await this.outQueues[job.data.bot.queueIdx].add("out", {
        bot: job.data.bot.id,
        text: res.choices[0].message.content!,
        user: job.data.user.usernameOrPhone,
        first: true,
      });
    } catch (e) {
      await this.manager.sendMessage(2074310819, "Error processing:" + e);
    }
  };

  private onOut = async (job: Job<IOutcomingTask>): Promise<void> => {
    await this.manager.sendMessage(
      2074310819,
      `#Обработка задачи. Очередь ${job.queueName}.`
    );
    const client = this.clients.getClient(job.data.bot);
    job.data.text = job.data.text.replaceAll(/【.+】/g, "").replaceAll("#", "");
    try {
      const m = new Message();
      m.botphone = job.data.bot;
      m.text = job.data.text;
      m.username = job.data.user;
      await this.msgRepo.save(m);
      await client.sendMessage(job.data.user, {
        message: job.data.text,
      });
      await this.manager.sendMessage(
        -1002201795929,
        `Отправлено сообщение. От: ${m.botphone}. К: ${
          m.username
        }. Дата: ${m.date.toUTCString()}`
      );
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
      await this.manager.sendMessage(2074310819, "Error sending:" + error);
    }
  };

  private onStart = async (msg: TelegramBot.Message): Promise<void> => {
    this.manager.sendMessage(
      msg.chat.id,
      "Я - менеджер ботов компании Legat Business"
    );
  };

  private onReset = async (msg: TelegramBot.Message): Promise<void> => {
    await this.processingQueue.drain();
    for (const q of this.outQueues) {
      console.log(await q.getJobCountByTypes("active", "waiting"));
      await q.drain();
    }
  };

  private onLog = async (msg: TelegramBot.Message): Promise<void> => {
    const counts = await this.processingQueue.getJobCountByTypes(
      "active",
      "waiting"
    );

    let c = 0;
    for (const q of this.outQueues) {
      const n = await q.getJobCountByTypes("active", "waiting");
      c += n;
    }
    this.manager.sendMessage(
      msg.from!.id,
      `В подготовке: ${counts}. В очередях: ${c}`
    );
  };

  private onWrite = async (msg: TelegramBot.Message): Promise<void> => {
    const to = msg.text!.split(" ")[1];
    const b = await this.botRepo.findOne({
      where: {
        blocked: false,
        send: true,
      },
    });
    const user = await this.userRepo.findOne({
      where: {
        usernameOrPhone: to,
      },
    });
    if (!b) throw new UnknownError("Bot is NULL", "OnWrite", this.reporter);
    if (!user) throw new InvalidInputError("User not found", this.reporter);
    try {
      const res = await this.openai.chat.completions.create({
        messages: [
          {
            role: "user",
            content: `Перепиши синонимично это сообщение, изменив слова и порядок абзацев (замени как минимум 15 слов синонимами), но сохранив мысль: ${
              b.gender === "male" ? startMessage : startMessage2
            }`,
          },
        ],
        model: "gpt-4o-mini",
        temperature: 1.2,
      });
      const thread = await this.openai.beta.threads.create({
        messages: [
          {
            content: res.choices[0].message.content!,
            role: "assistant",
          },
        ],
      });
      user.threadId = thread.id;
      user.botid = b.id;
      await this.userRepo.save(user);
      await this.outQueues[b.queueIdx].add("out", {
        bot: b.id,
        text: res.choices[0].message.content!,
        user: to,
      });
    } catch (e) {
      console.log(e);
    }
  };

  private onIncoming = async (job: Job<IIncomingTask>): Promise<void> => {
    const client = this.clients.getClient(job.data.bot);
    try {
      const dialogs = await client.getDialogs();
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
      if (!user.replied) {
        await this.manager.sendMessage(
          -1002244363083,
          `Получен ответ от клиента ${user.usernameOrPhone}`
        );
        user.replied = true;
        user.contactId = (
          await Bitrix.createContact(
            "@" + user.usernameOrPhone,
            user.usernameOrPhone,
            "Не дано"
          )
        ).data.result;
        const dialog = await client.getMessages(user.usernameOrPhone);
        user.dealId = (
          await Bitrix.createDeal(
            b.phone,
            "Нет",
            "Нет",
            "Полухолодный",
            dialog
              .filter(
                (el) =>
                  el.sender!.className == "User" ||
                  el.sender!.className == "UserEmpty"
              )
              .map((el) =>
                el.sender!.className == "User"
                  ? el.sender!.username + " " + el.text
                  : el.text
              )
              .join("\n\n")
          )
        ).data.result;
        await Bitrix.addContact(user.contactId, user.dealId);
      }
      await this.userRepo.save(user);
      await client.invoke(
        new Api.messages.ReadHistory({
          maxId: 0,
          peer: user.usernameOrPhone,
        })
      );
      await wait(7);
      await client.invoke(
        new Api.messages.SetTyping({
          peer: user.usernameOrPhone,
          action: new Api.SendMessageTypingAction(),
        })
      );

      const phone = (await client.getMe()).phone;
      const messages = await this.assistant.answerMessage(
        job.data.text,
        user,
        b,
        this.onRequiresAction
      );
      for (const m of messages) {
        await this.outQueues[b.queueIdx].add("send", {
          bot: b.id,
          text: m,
          user: user.usernameOrPhone,
          first: false,
        });
      }
    } catch (error) {
      console.error("ERROR PROCESSING MESSAGE " + error);
    }
  };

  private onRequiresAction = async (
    msg: string,
    user: User,
    bot: Bot,
    data: IData
  ): Promise<void> => {
    user.finished = true;
    await this.userRepo.save(user);
    await this.manager.sendMessage(
      -1002244363083,
      `Согласована встреча с клиентом. Номер телефона бота: ${bot.phone}\nКлиент:${user.usernameOrPhone}`
    );
    const client = this.clients.getClient(bot.id);
    const dialog = await client.getMessages(user.usernameOrPhone);
    const str = dialog
      .filter(
        (el) =>
          el.sender!.className == "User" || el.sender!.className == "UserEmpty"
      )
      .map((el) =>
        el.sender!.className == "User"
          ? el.sender!.username + " " + el.text
          : el.text
      )
      .join("\n\n");
    try {
      await Bitrix.editDeal(
        user.dealId,
        data.dateTime,
        data.segment,
        data.comment,
        str
      );
    } catch (e) {
      console.log("BITRIX ERROR " + e);
    }
  };

  private processingWorker: Worker<IProcessingTask> = new Worker(
    "proc",
    this.onProcessing
  );

  private inWorker: Worker<IIncomingTask> = new Worker(
    "in",
    this.onIncoming
  )
}
