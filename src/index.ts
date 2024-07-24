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
import input from "input";
import { Determiner } from "./determiner";
import { IsNull } from "typeorm";
import { Message } from "./entity/Message";
import { Whatsapp } from "./Whatsapp";
import { WhatsappUser } from "./entity/WhatsappUser";
import { Bitrix } from "./Bitrix";
import { ChatMsg } from "./entity/ChatMsg";
import cron from "node-cron";
import { Chat } from "./entity/Chat";
import { Thread } from "./entity/Thread";
const openAi = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
});
const determiner = new Determiner(openAi);
const clients = new Map<string, TelegramClient>();
let currentChatId: number;
interface IncomingReq {
  bot: string;
  userId: string;
  text: string;
}

interface OutcomingReq {
  bot: string;
  user: string;
  text: string;
  first?: boolean;
}

const outq = new Queue("p-out", {
  connection: {
    host: "redis",
  },
});
const inq = new Queue("p-in", {
  connection: {
    host: "redis",
  },
});

const procq = new Queue("proc", {
  connection: {
    host: "redis",
  },
});

export const wait = async (s: number) => {
  await new Promise((resolve, reject) => setTimeout(resolve, 1000 * s));
};
AppDataSource.initialize()
  .then(async () => {
    const userRepo = AppDataSource.getRepository(User);
    const botRepo = AppDataSource.getRepository(Bot);
    const chatRepo = AppDataSource.getRepository(ChatMsg);
    const cRepo = AppDataSource.getRepository(Chat);
    const threadRepo = AppDataSource.getRepository(Thread);
    const manager = new TgBot(
      "7347879515:AAGfiiuwBzlgFHHASnBnjxkwNPUooFXO3Qc",
      {
        polling: true,
      }
    );
    const manager2 = new TgBot(
      "7461695989:AAHAeqsiW7M15BTmNYRtRlb3VfN7UEJ7I08",
      {
        polling: true,
      }
    );

    const outw = new Worker(
      "p-out",
      async (job) => {
        
      },
      {
        limiter: {
          duration: 1000,
          max: 1,
        },
        connection: {
          host: "redis",
        },
        concurrency: 1,
      }
    );


    const procw = new Worker(
      "proc",
      async (job) => {
        
      },
      {
        connection: {
          host: "redis",
        },
        limiter: {
          max: 300,
          duration: 60000,
        },
        concurrency: 10
      }
    );
    

    const bots = await botRepo.find({
      where: {
        blocked: false,
      },
    });

    const queueIn = new Queue("in", {
      connection: {
        host: "redis",
      },
    });

    const queues = [];
    const workers = [];
    for (let i = 0; i < 50; i++) {
      queues.push(
        new Queue("out" + i, {
          connection: {
            host: "redis",
          },
        })
      );
      workers.push(
        new Worker('out' + i, handle, {
          connection: {
            host: 'redis',
          },
          limiter: {
            duration: 60000*5,
            max: 1
          }
        })
      )
    }
    const msgRepo = AppDataSource.getRepository(Message);
    const whatsapp = new Whatsapp(openAi, AppDataSource, manager, determiner);

    
    manager.onText(/\/whatsapp/, async () => {
      console.log("sending");
      const users = await AppDataSource.getRepository(WhatsappUser).find({
        take: 150,
        where: {
          finished: false,
          threadId: IsNull(),
        },
      });

      for (const user of users) {
        await whatsapp.schedule(user.phone);
      }
    });
    const workerIn = new Worker(
      "in",
      async (job) => {
        
      },
      {
        connection: {
          host: "redis",
        },
        limiter: {
          duration: 30000,
          max: 1,
        },
      }
    );
    const appId = 28082768;
    const appHash = "4bb35c92845f136f8eee12a04c848893";
    for (const bot of bots) {
      try {
        const session = new StringSession(bot.token);
        const client = new TelegramClient(session, appId, appHash, {
          useWSS: true,
        });
        await client.start({
          phoneNumber: async () => {
            //@ts-ignore
            return "";
          },
          phoneCode: async () => {
            //@ts-ignore
            return await input.text("code ?");
          },
          password: async () => {
            //@ts-ignore
            return await input.text("password ?");
          },
          onError: async () => {
            console.error("error");
            return true;
          },
        });
        client.addEventHandler(async (event) => {
          if (event.isPrivate) {
            await queueIn.add("in", {
              text: event.message.text,
              userId: event.message.senderId.toJSON(),
              bot: bot.id,
            });
          }
        }, new NewMessage());
        clients.set(bot.id, client);
      } catch (error) {
        console.log("ERROR SETTING UP CLIENT! " + error);
      }
    }

    whatsapp.listen();
  })
  .catch((error) => console.log(error));
