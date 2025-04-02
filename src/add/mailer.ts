import { Api, TelegramClient } from "telegram";
import { EntityManager, IsNull } from "typeorm";
import { AppDataSource } from "../data-source";
import { UserBot } from "../entity/bots/UserBot";
import { LogLevel } from "telegram/extensions/Logger";
import { Lead } from "../entity/bots/Lead";
import { StringSession } from "telegram/sessions";
import { wait } from "../utils/wait";
import { FloodWaitError } from "telegram/errors";
import { NewMessage, NewMessageEvent } from "telegram/events";
import TelegramBot, { Message } from "node-telegram-bot-api";
import OpenAI from "openai";
const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY
})
export class Mailer {
  private clients: Map<string, TelegramClient> = new Map<
    string,
    TelegramClient
  >();
  private manager: EntityManager = AppDataSource.manager;
  private asst: string = "asst_0yxkzSPNtPwwpFerJFhUMW8m";
  private reporter: TelegramBot;
  private reportChatId: number = 1391491967;

  constructor() {
    this.reporter = new TelegramBot(process.env.REPORTER_TG_TOKEN!, {
      polling: true
    });
    this.setup();
  }

  private async setup() {
    await AppDataSource.initialize();
    const bots = await this.manager.find(UserBot);
    for (const b of bots) {
      const client = new TelegramClient(
        new StringSession(b.token),
        +process.env.TG_API_ID!,
        process.env.TG_API_HASH!,
        {
          useWSS: true,
        }
      );
      client.setLogLevel(LogLevel.ERROR);
      await client.connect();
      client.addEventHandler(async (e) => this.respond.call(this, client, e), new NewMessage({
        incoming: true,
      }));
      this.clients.set(b.token, client);
    }
    this.reporter.onText(/\/mail/, this.mail.bind(this))
    this.reporter.onText(/\/leads/, this.getAllAnswered.bind(this))

  }

  private async mail() {
    console.log("on mail")
    const leads = await this.manager
      .getRepository(Lead)
      .createQueryBuilder("lead")
      .select()
      .where("lead.threadId IS NULL")
      .getMany();
    console.log(leads)
    const bots = await this.manager
      .getRepository(UserBot)
      .createQueryBuilder("bot")
      .select()
      // .where("bot.userId = :id", {
      //   id: userId,
      // })
      .getMany();

    let left = Math.min(leads.length, bots.length * 7);
    let msgs: string[] = [];
    let rounds = Math.ceil(left / 5);
    let currentLead = 0;
    console.log(left, rounds)
    for (let i = 0; i < rounds; i++) {
      let promises: Promise<string[]>[] = [];
      for (let j = 0; j < Math.min(left, 5); j++) {
        promises.push(this.generate(leads[currentLead]));
        currentLead++;
        left--;
      }

      const batch = await Promise.all(promises);
      for (let k of batch) {
        msgs.push(...k);
      }
      await wait(2);
    }

    left = Math.min(leads.length, bots.length * 7);
    currentLead = 0;
    while (left > 0) {
      let promises: Promise<any>[] = [];
      for (const b of bots) {
        if (left > 0) {
          promises.push(
            this.send.call(this, b, leads[currentLead], msgs[currentLead])
          );
          currentLead++;
          left--;
        }
      }
      await Promise.all(promises);
      await wait(60 * (Math.random() * 4 + 3));
    }
  }

  private async generate(lead: Lead): Promise<string[]> {
    console.log("started generating")
    const thread = await openai.beta.threads.create({
      messages: [
        {
          role: "user",
          content: `Имя: ${lead.name}`,
        },
      ],
    });

    lead.threadId = thread.id;
    await this.manager.save(lead);

    const msgs = await openai.beta.threads.runs
      .stream(thread.id, {
        assistant_id: this.asst,
      })
      .finalMessages();
    return msgs.map((el) => {
      if (el.content[0].type === "text") {
        for (const ann of el.content[0].text.annotations) {
          el.content[0].text.value.replaceAll(ann.text, "");
        }
        console.log("text");
        return el.content[0].text.value;
      }
      console.log("no text")
      return "";
    });
  }

  private async send(bot: UserBot, lead: Lead, msg: string): Promise<[boolean, boolean]> {
    try {
      console.log("trying sending")
      if (bot.floodErr) return [false, true];
      const client = this.clients.get(bot.token)!;
      await client.sendMessage(lead.username, {
        message: msg,
      });
      lead.sentAt = new Date();
      lead.bot = bot;
      lead.botId = bot.token;
      await this.manager.save(lead);
      await this.reporter.sendMessage(this.reportChatId, `Отправлено сообщение ${lead.username}`);
      return [true, false];
    } catch (err) {
      console.error(err)
      if (err instanceof FloodWaitError) {
        bot.floodErr = true;
        await this.manager.save(bot);
        return [false, true];
      } else {
        console.error(err);
        return [false, false];
      }
    }
  }

  private async respond(client: TelegramClient, e: NewMessageEvent) {
    if (e.isPrivate) {
      const dialogs = await client.getDialogs();
      const d = dialogs.find(el => el.isUser === true && el.id?.toJSON() === e.message.senderId?.toJSON());
      if (!d) return;
      const entity = d.entity as Api.User;
      const lead = await this.manager.findOne(Lead, {
        where: {
          username: entity.username
        },
        relations: {
          bot: true
        }
      });
      if (!lead) return;
      if (!lead.responded) {
        lead.responded = true;
        await this.manager.save(lead);
        const me = await client.getMe();
        await this.reporter.sendMessage(this.reportChatId, `Ответ на сообщение от лида ${lead.username}. Бот ${me.username} ${me.phone}`);
      }

      if (lead.handled) return;
      
      await wait(2)
      await client.invoke(new Api.messages.ReadHistory({
       peer: lead.username
     }));
      await client.invoke(new Api.messages.SetTyping({
        peer: lead.username,
        action: new Api.SendMessageTypingAction()
      }))
      await openai.beta.threads.messages.create(lead.threadId, {
        content: e.message.text,
        role: 'user'
      });

      const msgs = await openai.beta.threads.runs.stream(lead.threadId, {
        assistant_id: this.asst
      }).finalMessages();

      for (const msg of msgs) {
        if (msg.content[0].type === 'text') {
          for (const ann of msg.content[0].text.annotations) {
            msg.content[0].text.value.replace(ann.text, "");
          }

          if (!lead.bot.floodErr) {
            await client.sendMessage(lead.username, {
              message: msg.content[0].text.value
            });
          }
        }
      
      }
      
      }
  }


  private async getAllAnswered(msg: Message) {
    const leads = await this.manager
      .getRepository(Lead)
      .createQueryBuilder("lead")
      .select()
      .where("lead.responded = true")
      .andWhere("lead.handled = false")
      .leftJoin("lead.bot", "bot")
      .orderBy("lead.sentAt", "ASC")
      .getMany();

    let result = `All leads that are not yet handled (ordered by send date ascending, aka old first):\n`;
    let botMap = new Map<string, string>();
    for (const [token, client] of this.clients) {
      const me = await client.getMe();
      botMap.set(token, me.username!);
    }
    for (const lead of leads) {
      result += `${lead.username}, Bot connected to it: ${botMap.get(lead.bot.token)}\n`
    }

    await this.reporter.sendMessage(msg.from!.id, result);
  }
}


const m = new Mailer();
