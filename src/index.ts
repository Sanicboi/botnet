import { StringSession } from "telegram/sessions";
import { AppDataSource } from "./data-source";
import { Api, TelegramClient } from "telegram";
import { NewMessage } from "telegram/events";
import schedule from "node-schedule";
import OpenAI from "openai";
import { Bot } from "./entity/Bot";
import { User } from "./entity/User";
import TgBot from "node-telegram-bot-api";
import {Queue, Worker} from "bullmq";

import { text } from "stream/consumers";
import { Determiner } from "./determiner";
const openAi = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
});
const determiner = new Determiner(openAi)
const clients = new Map<string, TelegramClient>();
interface IncomingReq {
  bot: string;
  userId: string;
  text: string;
}

interface OutcomingReq {
  bot: string;
  user: string;
  text: string;
}
// НУ ЕБАНЫЙ РОТ ЕБУЧИЕ ТАЙМИНГИ

const wait = async (s: number) => {
  await new Promise((resolve, reject) => setTimeout(resolve, 1000 * s));
};
const startMessage =
  "Приветствую, меня зовут Сергей, я являюсь сооснователем бизнес клуба Legat Business. Хочу с Вами познакомиться и  понять по каким вопросам к Вам можно обращаться? Мы ищем интересные проекты в которые можно инвестировать, предпринимателей и экспертов для партнерства. Готовы направить к Вам нашу аудиторию в качестве клиентов. Видел Вас в нескольких чатах сообществ в телеграмм группах. Если требуется могу прислать информацию о себе для подтверждения.";
const startMessage2 =
  "У меня большое сообщество, думаю куда направить этот трафик. Для того чтобы наше взаимодействие было максимально продуктивным, хотелось бы уточнить где территориально работаете, с какими регионами? И готовы ли платить Агентское вознаграждение за привлечение клиентов? Если да то в каком процентном соотношении?";
AppDataSource.initialize()
  .then(async () => {
    const userRepo = AppDataSource.getRepository(User);
    const botRepo = AppDataSource.getRepository(Bot);
    const bots = await botRepo.find({
      take: 10,
    });
    const manager = new TgBot("6672883029:AAEe-3kIb6cUV1KUZxoedP_BdQ2JRTtTCpk", {
      polling: true,
    });

    manager.onText(/\/start/, async (msg) => {
      manager.sendMessage(
        msg.chat.id,
        "Я - менеджер ботов компании Legat Business"
      );
    });

    manager.onText(/\/send/, async (msg) => {
      const notTalked = await userRepo.find({
        where: {
          botid: null,
        },
      });
      let free = notTalked.length;

      for (const bot of bots) {
        const client = clients.get(bot.token);
        for (let i = 0; i < 5 && free > 0; i++) {
          const thread = await openAi.beta.threads.create({
            messages: [
              {
                content: startMessage,
                role: "assistant",
              },
            ],
          });

          notTalked[i].threadId = thread.id;
          notTalked[i].botid = bot.id;
          await userRepo.save(notTalked[i]);
          await queueOut.add("out", {
            bot: client.session.save(),
            text: startMessage,
            user: notTalked[i].usernameOrPhone
          });
          free--;
          setTimeout(async () => {
            try {
              const updated = await userRepo.findOneBy({
                usernameOrPhone: notTalked[i].usernameOrPhone,
              });
              if (!updated.replied) {
                await client.sendMessage(notTalked[i].usernameOrPhone, {
                  message: startMessage2,
                });
                await openAi.beta.threads.messages.create(updated.threadId, {
                  content: startMessage2,
                  role: "assistant",
                });
              }
            } catch (error) {
              console.error("ERROR SENDING AFTER 30MIN");
            }
          }, 1000 * 60 * 30);
        }
      }
    });

    const queueIn = new Queue('in', {
      connection: {
        host: 'redis'
      }
    });
    const queueOut = new Queue('out', {
      connection: {
          host: "redis",
      }
    });
    const workerOut = new Worker('out', async (job) => {
      const msg: OutcomingReq = job.data;
      const client = clients.get(msg.bot);
      try {
        await client.sendMessage(msg.user, {
          message: msg.text,
        });
      } catch (error) {
        console.error("ERROR SENDING MESSAGE ", error);
      }
    }, {
      connection: {
        host: 'redis'
      },
      limiter: {
        duration: 30000,
        max: 1
      }
    });

    const workerIn = new Worker('in', async (job) => {
      // ОБРАБОТАТЬ ВХОДЯЩЕЕ СООБЩЕНИЕ С ТАЙМИНГОМ
      const msg: IncomingReq = job.data;
      const client = clients.get(msg.bot);
      try {
        const dialogs = await client.getDialogs();
        const cl = dialogs.find((el) => {
          return (
            el.entity.className === "User" &&
            el.entity.id.toString() === msg.userId
          );
        });
        if (!cl) return;
        const username = cl.entity as Api.User;
        const user = await userRepo.findOne({
          where: {
            usernameOrPhone: username.username,
          },
        });
        if (!user.replied) user.replied = true;
        await userRepo.save(user);
        await client.invoke(new Api.messages.ReadHistory({
          maxId: 0,
          peer: user.usernameOrPhone
        }))
        await wait(7);
        await client.invoke(
          new Api.messages.SetTyping({
            peer: user.usernameOrPhone,
            action: new Api.SendMessageTypingAction(),
          })
        );
        await determiner.sendDetermined(msg.text, user, msg.bot, queueOut);
      } catch (error) {
        console.error("ERROR PROCESSING MESSAGE " + error);
      }
    }, {
      connection: {
        host: "redis"
      },
      limiter: {
        duration: 30000,
        max: 1
      }
    });
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
            return await input.text("number ?");
          },
          phoneCode: async () => {
            //@ts-ignore
            return await input.text("code ?");
          },
          password: async () => {
            //@ts-ignore
            return await input.text("password ?");
          },
          onError: () => {
            console.error("error");
            botRepo.delete(bot);
          },
        });
        client.addEventHandler(async (event) => {
          if (event.isPrivate) {
            await queueIn.add(
              "in",
              {
                text: event.message.text,
                userId: event.message.senderId.toJSON(),
                bot: client.session.save(),
              }
            );
          }

        }, new NewMessage());
        clients.set(bot.token, client);
      } catch (error) {
        console.log("ERROR SETTING UP CLIENT! " + error);
      }
    }
  })
  .catch((error) => console.log(error));
  