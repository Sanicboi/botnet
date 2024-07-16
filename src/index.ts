import { StringSession } from "telegram/sessions";
import { AppDataSource } from "./data-source";
import { Api, TelegramClient, client } from "telegram";
import { NewMessage } from "telegram/events";
import schedule from "node-schedule";
import OpenAI from "openai";
import { Bot } from "./entity/Bot";
import { User } from "./entity/User";
import TgBot from "node-telegram-bot-api";
import { Queue, Worker } from "bullmq";
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

const wait = async (s: number) => {
  await new Promise((resolve, reject) => setTimeout(resolve, 1000 * s));
};
const startMessage =
  "Приветствую, я являюсь сооснователем бизнес клуба. Хочу с Вами познакомиться и  понять по каким вопросам к Вам можно обращаться? Мы ищем интересные проекты в которые можно инвестировать, предпринимателей и экспертов для партнерства. Готовы направить к Вам нашу аудиторию в качестве клиентов. Видел Вас в нескольких чатах сообществ в телеграмм группах. Если требуется могу прислать информацию о нас.";
const startMessage2 =
  "Приветствую, я являюсь менеджером бизнес клуба. Хочу с Вами познакомиться и понять по каким вопросам к Вам можно обращаться? Мы ищем интересные проекты в которые можно инвестировать, предпринимателей и экспертов для партнерства. Готовы направить к Вам нашу аудиторию в качестве клиентов. Видела Вас в нескольких чатах сообществ в телеграмм группах. Если требуется могу прислать информацию о нас.";
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
        try {
          console.log("Out job");
          const client = clients.get(job.data.bot.id);
          const me = await client.getMe();
          const msgs = await openAi.beta.threads.runs
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
              id: job.data.chatId
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
          const b = await botRepo.findOneBy({ id: job.data.bot.id });
          b.quota--;
          await botRepo.save(b);
        } catch (err) {
          console.log(err);
          await manager.sendMessage(
            -1002201795929,
            `Ошибка отправки сообщения прогреватором с аккаунта ${job.data.bot.phone}. Ошибка: ${err}`
          );
        }
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

    const inw = new Worker(
      "p-in",
      async (job) => {
        const threads = await threadRepo
          .createQueryBuilder('thread')
          .select()
          .leftJoinAndSelect('thread.bot', 'bot')
          .leftJoinAndSelect('thread.chat', 'chat')
          .where('chat.id = :id', {
            id: job.data.msg.chatid
          })
          .getMany();
        console.log(threads);
        try {
          console.log("In job");
          for (const thread of threads) {
            try {
              if (job.data.msg.from === thread.bot.from) continue;
              await openAi.beta.threads.messages.create(thread.id, {
                role: "user",
                content: job.data.username + ": " + job.data.msg.text,
              });
              console.log('iter', thread.id)
            } catch (e) {
              console.log("ERR " + e);
            }
          }
          const msg = await chatRepo.findOne({
            where: {
              id: job.data.msg.id,
            },
          });
          console.log(msg);
          msg.queued = true;
          await chatRepo.save(msg);
        } catch (e) {
          console.log("CRITICAL ERR" + e);
        }
      },
      {
        connection: {
          host: "redis",
        },
        concurrency: 1,
      }
    );

    const procw = new Worker(
      "proc",
      async (job) => {
        const client = clients.get(job.data.bot.id);
        const res = await openAi.chat.completions.create({
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
          model: "gpt-3.5-turbo",
          temperature: 1,
        });
        const thread = await openAi.beta.threads.create({
          messages: [
            {
              content: res.choices[0].message.content,
              role: "assistant",
            },
          ],
        });
        const user = await userRepo.findOneBy({
          usernameOrPhone: job.data.user.usernameOrPhone,
        });
        user.threadId = thread.id;
        user.botid = job.data.bot.id;
        await userRepo.save(user);
        await queues[job.data.bot.queueIdx].add("out", {
          bot: job.data.bot.id,
          text: res.choices[0].message.content,
          user: job.data.user.usernameOrPhone,
          first: true,
        });
      },
      {
        connection: {
          host: "redis",
        },
        limiter: {
          max: 5000,
          duration: 60000,
        },
      }
    );
    manager2.onText(/./, async (m) => {
      console.log("Recieving message");
      try {
        const chat = await cRepo.findOne({
          where: {
            id: String(m.chat.id)
          }
        });
        if (chat && chat.listen) {
          const msg = new ChatMsg();
          msg.chatid = String(m.chat.id);
          msg.text = m.text;
          msg.from = String(m.from.id);
          msg.handled = false;
          await chatRepo.save(msg);
          console.log(msg);
          await inq.add("handle", {
            msg,
            username: `Имя пользователя: ${m.from.username}, Имя: ${m.from.first_name}`,
            chat
          });
        }
      } catch (e) {
        console.log(e)
      }
    });

    manager2.onText(/\/on/, async (msg) => {
      const bots = await botRepo.find({
        where: {
          blocked: false,
          progrevat: true,
        },
      });
      await cRepo.createQueryBuilder('chat')
      .update()
      .where("chat.id = :id", {
        id: msg.text.split(" ")[1]
      })
      .set({
        listen: true
      })
      .execute();
      bots.forEach(async (bot) => {
        const thread = new Thread();
        thread.bot = bot;
        thread.chat = await cRepo.findOne({
          where: {
            id: msg.text.split(" ")[1]
          }
        });
        thread.id = (
          await openAi.beta.threads.create({
            messages: [],
          })
        ).id;
        await threadRepo.save(thread);
      });
    });

    manager2.onText(/\/off/, async (msg) => {
      const id = msg.text.split(" ")[1];
      await cRepo.createQueryBuilder('chat')
      .update()
      .where("chat.id = :id", {
        id: msg.text.split(" ")[1]
      })
      .set({
        listen: false
      })
      .execute();
      const chat = await cRepo.findOneBy({id})
      try {
        const threads = await threadRepo.find({
          where: {
            chat,
          },
          relations: {
            bot: true
          }
        });
          for (const t of threads) {
            await openAi.beta.threads.del(t.id);
          }
        await threadRepo
          .createQueryBuilder('thread')
          .delete()
          .where('thread.id IN (:...ids)', {
            ids: threads.map(el => el.id)
          })
          .execute();
        await AppDataSource.createQueryBuilder()
          .update(ChatMsg)
          .where("handled = false")
          .andWhere("chatid = :id", {
            id
          })
          .set({
            handled: true,
          })
          .execute();
      } catch (e) {}
    });
    manager2.onText(/\/set/, async (msg) => {
      try {
        const bots = await botRepo.find({
          where: {
            blocked: false,
            progrevat: true,
          },
        });
        for (const bot of bots) {
          const client = clients.get(bot.id);
          bot.from = (await client.getMe()).id.toString();
          await botRepo.save(bot);
        }
      } catch (e) {}
    });
    manager2.onText(/\/restart/, async (msg) => {
      const bots = await botRepo.find({
        where: {
          blocked: false,
          progrevat: true,
        },
      });
      bots.forEach(async (bot) => {
        bot.quota = 3;
        await botRepo.save(bot);
      });
    });

    cron.schedule("*/1 * * * *", async () => {
      const chats = await cRepo.find({
        where: {
          listen: true
        }
      });
      for (const chat of chats) {
        const msgs = await chatRepo.find({
          where: {
            handled: false,
            chatid: chat.id,
            queued: true
          },
          order: {
            createdAt: {
              direction: "DESC",
            },
          },
        });
  
        if (msgs.length > 0) {
          const threads = await threadRepo.find({
            where: {
              chat: chat,
            },
            relations: {
              bot: true,
              chat: true
            }
          });
          console.log(threads);

          const notFrom = threads.filter((el) => el.bot.from != msgs[0].from);
          const quoted = notFrom.filter((el) => el.bot.quota > 0);
          const eligible = quoted;
          const i = Math.round(Math.random() * (eligible.length - 1));
          const b = eligible[i];
          await outq.add("send", {
            bot: b.bot,
            chatId: chat.id,
            thread: b
          });
        }
      }
      
    });
    manager2.onText(/\/chat/, async (msg) => {
      const id = msg.text.split(" ")[1];
      const chat = new Chat();
      chat.listen = false;
      chat.id = id;
      await cRepo.save(chat);
    })

    manager.onText(/\/start/, async (msg) => {
      manager.sendMessage(
        msg.chat.id,
        "Я - менеджер ботов компании Legat Business"
      );
    });
    manager.onText(/\/write/, async (msg) => {
      const to = msg.text.split(" ")[1];
      const b = await botRepo.findOne({
        where: {
          blocked: false,
          send: true,
        },
      });
      const user = await userRepo.findOne({
        where: {
          usernameOrPhone: to,
        },
      });
      try {
        const res = await openAi.chat.completions.create({
          messages: [
            {
              role: "user",
              content: `Перепиши синонимично это сообщение, изменив слова и порядок абзацев (замени как минимум 15 слов синонимами), но сохранив мысль: ${
                b.gender === "male" ? startMessage : startMessage2
              }`,
            },
          ],
          model: "gpt-4-turbo",
          temperature: 1.2,
        });
        const thread = await openAi.beta.threads.create({
          messages: [
            {
              content: res.choices[0].message.content,
              role: "assistant",
            },
          ],
        });
        user.threadId = thread.id;
        user.botid = b.id;
        await userRepo.save(user);
        await queues[b.queueIdx].add("out", {
          bot: b.id,
          text: res.choices[0].message.content,
          user: to,
        });
      } catch (e) {
        console.log(e);
      }
    });
    manager.onText(/\/send/, async (msg) => {
      const nBots = await botRepo.find({
        where: {
          blocked: false,
          send: true,
        },
      });
      const notTalked = await userRepo.find({
        where: {
          botid: IsNull(),
          finished: false,
        },
      });
      let free = notTalked.length;
      let total = 0;
      for (let i = 0; i < nBots.length; i++) {
        const bot = nBots[i];
        const client = clients.get(bot.id);
        let currentCount = 0;
        const toSend = bot.premium ? 25 : 15;
        bot.queueIdx = i % 30;
        await botRepo.save(bot);
        while (currentCount <= toSend && free > 0) {
          try {
            await procq.add("gen", {
              user: notTalked[total],
              bot: bot,
            });
            free--;
            total++;
            currentCount++;
          } catch (err) {
            console.log("ERROR STARTING", err);
          }
        }
      }
    });
    manager.onText(/\/reset/, async (msg) => {
      for (const q of queues) {
        console.log(await q.getJobCountByTypes("active", "waiting"));
        await q.drain();
      }
    });
    manager.onText(/\/log/, async (msg) => {
      for (const q of queues) {
        console.log(await q.getJobCountByTypes("active", "waiting"));
      }
    });
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

    const handle = async (job) => {
      const msg: OutcomingReq = job.data;
      const client = clients.get(msg.bot);
      msg.text = msg.text.replaceAll(/【.+】/g, "");
      try {
        const m = new Message();
        m.botphone = msg.bot;
        m.text = msg.text;
        m.username = msg.user;
        await msgRepo.save(m);
        await client.sendMessage(msg.user, {
          message: msg.text,
        });
        await manager.sendMessage(
          -1002201795929,
          `Отправлено сообщение. От: ${m.botphone}. К: ${
            m.username
          }. Дата: ${m.date.toUTCString()}`
        );
        if (msg.first) {
          const obj = await botRepo.findOneBy({
            id: msg.bot,
          });
          obj.sentMsgs++;
          await botRepo.save(obj);
        }
      } catch (error) {
        console.error("ERROR SENDING MESSAGE ", error);
      }
    };
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
            duration: 60000*3,
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
          const b = await botRepo.findOne({
            where: {
              id: msg.bot,
            },
          });
          if (!user.replied) {
            await manager.sendMessage(
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
                  .filter(el => el.sender.className == 'User' || el.sender.className == 'UserEmpty')
                  .map((el) => el.sender.className == 'User'? el.sender.username + " " + el.text: el.text)
                  .join("\n\n")
              )
            ).data.result;
            await Bitrix.addContact(user.contactId, user.dealId);
          }
          await userRepo.save(user);
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
          await determiner.sendDetermined(
            msg.text,
            user,
            msg.bot,
            queues[b.queueIdx],
            manager,
            userRepo,
            phone,
            b.gender,
            (
              await client.getMe()
            ).firstName
          );
        } catch (error) {
          console.error("ERROR PROCESSING MESSAGE " + error);
        }
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
