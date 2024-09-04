import { StringSession } from "telegram/sessions";
import { AppDataSource } from "./data-source";
import { Api, TelegramClient, client } from "telegram";
import { NewMessage } from "telegram/events";
import schedule from "node-schedule";
import OpenAI from "openai";
import { Bot } from "./entity/Bot";
import { User } from "./entity/User";
import TgBot from "node-telegram-bot-api";
import { Job, Queue, Worker } from "bullmq";
import { IsNull } from "typeorm";
import { Message } from "./entity/Message";
// import { Whatsapp } from "./Whatsapp";
import { WhatsappUser } from "./entity/WhatsappUser";
import { Bitrix } from "./Bitrix";
import cron from "node-cron";
import { Chat } from "./entity/Chat";
import { Assistant } from "./Assistant";
import { TelegramMailer } from "./mailer/TelegramMailer";
const openAi = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
});

export const wait = async (s: number) => {
  await new Promise((resolve, reject) => setTimeout(resolve, 1000 * s));
};
AppDataSource.initialize()
  .then(async () => {
    const reporter = new TgBot(process.env.REPORTER_TG_TOKEN ?? '', {
      polling: true,
    });

    // const whatsapp = new Whatsapp(openAi, AppDataSource, manager, determiner);

    
    // manager.onText(/\/whatsapp/, async () => {
    //   console.log("sending");
    //   const users = await AppDataSource.getRepository(WhatsappUser).find({
    //     take: 150,
    //     where: {
    //       finished: false,
    //       threadId: IsNull(),
    //     },
    //   });

    //   for (const user of users) {
    //     await whatsapp.schedule(user.phone);
    //   }
    // });
 

    // whatsapp.listen();
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
        const client = new TelegramClient(session, Number(process.env.TG_APP_ID), process.env.TG_APP_HASH ?? '', {
          useWSS: true,
          connectionRetries: 1,
          timeout: 0.5
        });
        await client.start({
            onError: async (e) => true,
            phoneNumber: async () => "",
            phoneCode: async () => ""
        });
        clients.set(b.id, client); 
      } catch (e) {
        console.log(e);
      }
  }
  const mailer = new TelegramMailer(openAi, reporter, assistant, 50, clients, bots);
  })
  .catch((error) => console.log(error));
