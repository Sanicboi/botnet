import { TelegramClient } from "telegram";
import { EntityManager, IsNull } from "typeorm";
import { AppDataSource } from "../data-source";
import { UserBot } from "../entity/bots/UserBot";
import { LogLevel } from "telegram/extensions/Logger";
import { Lead } from "../entity/bots/Lead";
import { StringSession } from "telegram/sessions";

export class Mailer {
  private clients: Map<string, TelegramClient> = new Map<
    string,
    TelegramClient
  >();
  private manager: EntityManager = AppDataSource.manager;

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
        },
      );
      client.setLogLevel(LogLevel.ERROR);
      await client.connect();
      this.clients.set(b.token, client);
    }
  }

  public async mail(userId: string) {
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
      .where("bot.userId = :id", {
        id: userId,
      })
      .getMany();

    let totalLeads = leads.length;

    leads: while (totalLeads > 0) {
      for (let bot of bots) {
        if (totalLeads === 0) break leads;
      }
    }
  }
}
