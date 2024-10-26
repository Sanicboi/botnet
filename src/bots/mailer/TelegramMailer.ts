import TelegramBot from "node-telegram-bot-api";
import OpenAI from "openai";
import { Repository } from "typeorm";
import { Bot } from "../entity/Bot";
import { AppDataSource } from "../data-source";
import { User } from "../entity/User";
import { InvalidInputError, UnknownError } from "../utils/Errors";
import { Message } from "../entity/Message";
import { TelegramClient } from "telegram";
import { Assistant, IData } from "../Assistant";
import { NewMessageEvent } from "telegram/events";
import { Sender } from "./Sender";
import { Handler } from "./Handler";
import { Processor } from "./Processor";
import { Manager } from "./Manager";
import { CascadeUser } from "../entity/CascadeUser";
import { SpamSender } from "./SpamSender";

const startMessage =
  "Приветствую, я являюсь сооснователем бизнес клуба. Хочу с Вами познакомиться и  понять по каким вопросам к Вам можно обращаться? Мы ищем интересные проекты в которые можно инвестировать, предпринимателей и экспертов для партнерства. Готовы направить к Вам нашу аудиторию в качестве клиентов. Видел Вас в нескольких чатах сообществ в телеграмм группах. Если требуется могу прислать информацию о нас.";
const startMessage2 =
  "Приветствую, я являюсь менеджером бизнес клуба. Хочу с Вами познакомиться и понять по каким вопросам к Вам можно обращаться? Мы ищем интересные проекты в которые можно инвестировать, предпринимателей и экспертов для партнерства. Готовы направить к Вам нашу аудиторию в качестве клиентов. Видела Вас в нескольких чатах сообществ в телеграмм группах. Если требуется могу прислать информацию о нас.";

const dobiv1 = "Есть ли у Вас какие-то вопросы?";
const dobiv2 =
  "Я могу предоставить Вам дополнительную информацию о компании, если нужно.";
const dobiv3 = "Если Вам неинтересно, можем отложить обсуждение.";
export class TelegramMailer {
  private botRepo: Repository<Bot> = AppDataSource.getRepository(Bot);
  private userRepo: Repository<User> = AppDataSource.getRepository(User);
  private msgRepo: Repository<Message> = AppDataSource.getRepository(Message);
  private sender: Sender;
  private handler: Handler;
  private processor: Processor;
  private spamSender: SpamSender;
  private manager: Manager = new Manager();

  constructor(
    private openai: OpenAI,
    private reporter: TelegramBot,
    private assistant: Assistant,
    private queueCount: number = 50,
    private clients: Map<string, TelegramClient>,
    bots: Bot[],
  ) {
    this.setup();

    this.sender = new Sender(
      queueCount,
      this.manager,
      this.clients,
      this.reporter,
    );
    this.handler = new Handler(
      this.clients,
      this.reporter,
      this.manager,
      this.assistant,
      this.sender,
    );
    this.processor = new Processor(
      this.clients,
      this.openai,
      this.reporter,
      this.sender,
    );
    this.spamSender = new SpamSender(
      this.clients,
      this.manager,
      this.queueCount,
    );
  }

  private async onSend(msg: TelegramBot.Message): Promise<void> {
    try {
      const nBots = await this.botRepo.find({
        where: {
          blocked: false,
          send: true,
        },
      });
      const notTalked = await this.userRepo
        .createQueryBuilder("user")
        .select()
        .leftJoinAndSelect("user.cascade", "cascade")
        .where("cascade.id IS NULL")
        .getMany();
      console.log(notTalked);
      let free = notTalked.length;
      let total = 0;
      for (let i = 0; i < nBots.length; i++) {
        const bot = nBots[i];
        const client = this.clients.get(bot.id);
        let currentCount = 0;
        const toSend = 25;
        bot.queueIdx = i % this.queueCount;
        await this.botRepo.save(bot);
        while (currentCount <= toSend && free > 0) {
          try {
            await this.processor.process(bot, notTalked[total]);
            free--;
            total++;
            currentCount++;
          } catch (err) {
            await this.manager.reportToMe(
              "Error adding to processing queue: " + err,
            );
          }
        }
      }
    } catch (e) {
      console.log(e);
    }
  }

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
      user.cascade = new CascadeUser();
      user.cascade.threadId = thread.id;
      user.cascade.bot = b;
      await this.userRepo.save(user);
      await this.sender.add(b.queueIdx, {
        bot: b.id,
        text: res.choices[0].message.content!,
        user: to,
      });
    } catch (e) {}
  };

  private onRequiresAction = async (
    msg: string,
    user: User,
    bot: Bot,
    data: IData,
  ): Promise<void> => {};

  public onMessage = async (e: NewMessageEvent, bot: Bot): Promise<void> => {
    if (e.isPrivate) {
      await this.handler.add(e, bot);
    }
  };

  private async onSendSpam() {
    await this.spamSender.sendSpam();
  }

  public setup() {
    this.onSend = this.onSend.bind(this);
    this.onWrite = this.onWrite.bind(this);
    this.onMessage = this.onMessage.bind(this);
    this.onRequiresAction = this.onRequiresAction.bind(this);
    this.onSendSpam = this.onSendSpam.bind(this);
    this.manager.onText(/\/send/, this.onSend);
    this.manager.onText(/\/write/, this.onWrite);
    this.manager.onText(/\/spam/, this.onSendSpam);
  }
}
