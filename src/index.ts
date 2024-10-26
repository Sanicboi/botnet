import { StringSession } from "telegram/sessions";
import { AppDataSource } from "./data-source";
import { Api, TelegramClient, client } from "telegram";
import { NewMessage } from "telegram/events";
import schedule from "node-schedule";
import OpenAI from "openai";
import { Bot } from "./entity/Bot";
import { User } from "./entity/User";
import TgBot from "node-telegram-bot-api";
import { Assistant } from "./bots/Assistant";
import { TelegramMailer } from "./bots/mailer/TelegramMailer";
import { Commenter } from "./bots/commenter/Commenter";
import { Seeder } from "./bots/seeder/Seeder";
import { Smm } from "./ai/smm/Smm";
import { CrossMailer } from "./bots/crossmailer/CrossMailer";
export const openAi = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
});

export const wait = async (s: number) => {
  await new Promise((resolve, reject) => setTimeout(resolve, 1000 * s));
};
AppDataSource.initialize()
  .then(async () => {
    const reporter = new TgBot(process.env.REPORTER_TG_TOKEN ?? "", {
      polling: true,
    });

    const bots = await AppDataSource.getRepository(Bot).find({
      where: {
        blocked: false,
      },
    });
    const clients: Map<string, TelegramClient> = new Map();
    const assistant = new Assistant(openAi);

    for (const b of bots) {
      try {
        const session = new StringSession(b.token);
        const client = new TelegramClient(
          session,
          Number(process.env.TG_APP_ID),
          process.env.TG_APP_HASH ?? "",
          {
            useWSS: true,
            connectionRetries: 1,
            timeout: 0.5,
          },
        );
        await client.start({
          onError: async (e) => true,
          phoneNumber: async () => "",
          phoneCode: async () => "",
        });
        console.log((await client.getMe()).username);
        clients.set(b.id, client);
      } catch (e) {
        console.log(e);
      }
    }
    const mailer = new TelegramMailer(
      openAi,
      reporter,
      assistant,
      50,
      clients,
      bots,
    );
    const commenter = new Commenter(clients, assistant);
    const smm = new Smm(openAi);
    const seeder = new Seeder(clients, smm.bot);
    const heater = new CrossMailer(clients);
    reporter.onText(/\/seed/, () => {
      seeder.onSeed();
    });
    reporter.onText(/\/heat/, () => {
      heater.onHeat();
    });

    for (const b of bots) {
      const client = clients.get(b.id);
      client!.addEventHandler(async (e) => {
        await mailer.onMessage(e, b);
        await commenter.onMessage(e, b);
      }, new NewMessage());
    }
  })
  .catch((error) => console.log(error));
