import { Api, TelegramClient } from "telegram";
import { EntityManager, IsNull } from "typeorm";
import { AppDataSource } from "../data-source";
import { UserBot } from "../entity/bots/UserBot";
import { LogLevel } from "telegram/extensions/Logger";
import { Lead } from "../entity/bots/Lead";
import { StringSession } from "telegram/sessions";
import { bot, openai } from "../neuro";
import { wait } from "../utils/wait";
import { FloodWaitError } from "telegram/errors";
import { NewMessage, NewMessageEvent } from "telegram/events";
import TelegramBot from "node-telegram-bot-api";

export class Mailer {
  private clients: Map<string, TelegramClient> = new Map<
    string,
    TelegramClient
  >();
  private manager: EntityManager = AppDataSource.manager;
  private asst: string = "";
  private reporter: TelegramBot = new TelegramBot(process.env.MAILER_TOKEN!, {
    polling: true
  });
  private reportChatId: number = 0;

  constructor() {
    this.setup();
  }

  private async setup() {
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

    bot.onText(/\/mail/, this.mail.bind(this))
    bot.onText
  }

  public async mail() {
    const leads = await this.manager
      .createQueryBuilder()
      .select()
      .from(Lead, "lead")
      .where("lead.botId IS NULL")
      .getMany();

    const bots = await this.manager
      .createQueryBuilder()
      .select()
      .from(UserBot, "bot")
      // .where("bot.userId = :id", {
      //   id: userId,
      // })
      .getMany();

    let left = Math.min(leads.length, bots.length * 15);
    let msgs: string[] = [];
    let rounds = Math.ceil(left / 25);
    let currentLead = 0;
    for (let i = 0; i < rounds; i++) {
      let promises: Promise<string[]>[] = [];

      for (let j = 0; j < Math.min(left, 25); j++) {
        currentLead++;
        promises.push(this.generate.call(this, leads[currentLead]));
        left--;
      }

      const batch = await Promise.all(promises);
      for (let k of batch) {
        msgs.push(...k);
      }
    }

    left = Math.min(leads.length, bots.length * 15);
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
    const thread = await openai.beta.threads.create({
      messages: [
        {
          role: "user",
          content: "Начни диалог",
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
        return el.content[0].text.value;
      }
      return "";
    });
  }

  private async send(bot: UserBot, lead: Lead, msg: string) {
    try {
      const client = this.clients.get(bot.token)!;
      await client.sendMessage(lead.username, {
        message: msg,
      });
      lead.sentAt = new Date();
      await this.manager.save(lead);
    } catch (err) {
      if (err instanceof FloodWaitError) {
        bot.floodErr = true;
        await this.manager.save(bot);
      } else {
        console.error(err);
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
        await this.reporter.sendMessage(this.reportChatId, `Ответ на сообщение от лида ${lead.username}`);
      }
      
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
            await client.sendMessage(msg.content[0].text.value);
          }
        }
      }
    }

  }
}
