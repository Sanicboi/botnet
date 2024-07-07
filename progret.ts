import { Api, TelegramClient } from "telegram";
import { AppDataSource } from "./src/data-source";
import { Bot } from "./src/entity/Bot";
import cron from "node-cron";
import { StringSession } from "telegram/sessions";
import { NewMessage } from "telegram/events";
import { ChatMsg } from "./src/entity/ChatMsg";
import TelegramBot from "node-telegram-bot-api";
import OpenAI from "openai";
import { Queue, Worker } from "bullmq";
const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
});
const chats: number[] = [-1002202356312, -1002016793708];
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

let currentChatId: number;

AppDataSource.initialize().then(async () => {
  const botRepo = AppDataSource.getRepository(Bot);
  const msgRepo = AppDataSource.getRepository(ChatMsg);
  const bots = await botRepo.find({
    where: {
      blocked: false,
      progrevat: true,
    },
  });
  const manager = new TelegramBot(
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
        console.log(job.data);
        const client = clients.get(job.data.bot.id);
        const me = await client.getMe();
        const msgs = await openai.beta.threads.runs
          .stream(job.data.bot.currentThreadId, {
            assistant_id: "asst_NcMJnXsqlSLzGWj7SBgz56at",
            additional_instructions: `Ты пишешь с аккаунта ${me.username} (${me.firstName})`,
          })
          .finalMessages();
        await AppDataSource.createQueryBuilder()
          .update(ChatMsg)
          .where("handled = false")
          .andWhere("queued = true")
          .set({
            handled: true,
          })
          .execute();
        for (const m of msgs) {
          await client.sendMessage(job.data.bot.currentChatId, {
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
      }
    },
    {
      limiter: {
        duration: 10000,
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
      try {
        console.log("In job");
        for (const bot of bots) {
          try {
            if (job.data.msg.from === bot.from) continue;
            await openai.beta.threads.messages.create(bot.currentThreadId, {
              role: "user",
              content: job.data.username + ": " + job.data.msg.text,
            });
          } catch (e) {
            console.log("ERR " + e);
          }
        }
        const msg = await msgRepo.findOne({
          where: {
            id: job.data.msg.id,
          },
        });
        console.log(msg);
        msg.queued = true;
        await msgRepo.save(msg);
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

  manager.onText(/./, async (m) => {
    console.log(m.chat.id);
    console.log(currentChatId);
    try {
      if (chats.includes(m.chat.id) && m.chat.id == currentChatId) {
        const msg = new ChatMsg();
        msg.chatid = String(m.chat.id);
        msg.text = m.text;
        msg.from = String(m.from.id);
        msg.handled = false;
        await msgRepo.save(msg);
        console.log();
        await inq.add("handle", {
          msg,
          username: `Имя пользователя: ${m.from.username}, Имя: ${m.from.first_name}`,
        });
      }
    } catch (e) {}
  });
  const clients = new Map<string, TelegramClient>();
  bots.forEach(async (b) => {
    try {
      const session = new StringSession(b.token);
      const client = new TelegramClient(
        session,
        28082768,
        "4bb35c92845f136f8eee12a04c848893",
        { useWSS: true }
      );
      await client.start({
        async onError(e) {
          console.log(e);
          return true;
        },
        phoneCode: async () => "",
        phoneNumber: async () => "",
      });
      clients.set(b.id, client);
      client.addEventHandler(async (e) => {}, new NewMessage());
    } catch (e) {}
  });
  manager.onText(/\/on/, (msg) => {
    bots.forEach(async (bot) => {
      bot.currentChatId = msg.text.split(" ")[1];
      bot.currentThreadId = (
        await openai.beta.threads.create({
          messages: [],
        })
      ).id;
      currentChatId = +msg.text.split(" ")[1];
      await botRepo.save(bot);
    });
  });
  manager.onText(/\/off/, async (msg) => {
    try {
      bots.forEach(async (bot) => {
        bot.currentChatId = "";
        await openai.beta.threads.del(bot.currentThreadId);
        bot.currentThreadId = "";
        currentChatId = 0;
        await botRepo.save(bot);
      });
      await AppDataSource.createQueryBuilder()
        .update(ChatMsg)
        .where("handled = false")
        .set({
          handled: true,
        })
        .execute();
    } catch (e) {}
  });
  manager.onText(/\/set/, async (msg) => {
    bots.forEach(async (bot) => {
      const client = clients.get(bot.id);
      bot.from = (await client.getMe()).id.toString();
      await botRepo.save(bot);
    });
  });
  manager.onText(/\/restart/, async (msg) => {
    bots.forEach(async (bot) => {
      bot.quota = 4;
      await botRepo.save(bot);
    });
  });
  cron.schedule("*/30 * * * * *", async () => {
    const msgs = await msgRepo.find({
      where: {
        handled: false,
      },
      order: {
        createdAt: {
          direction: "DESC",
        },
      },
    });

    if (msgs.length > 0) {
      const notFrom = bots.filter((el) => el.from != msgs[0].from);
      console.log(notFrom);
      const fromChat = notFrom.filter(
        (el) => el.currentChatId == msgs[0].chatid
      );
      console.log(fromChat);
      const quoted = fromChat.filter((el) => el.quota > 0);
      const eligible = quoted;
      const i = Math.round(Math.random() * (eligible.length - 1));
      console.log(eligible);
      const b = eligible[i];
      await outq.add("send", {
        bot: b,
      });
    }
  });
  // cron.schedule('*/30 * * * * *', async () => {
  //     const msg = await msgRepo.findOne({
  //         where: {
  //             handled: false
  //         }
  //     });
  //     if (!msg) return;
  //     const currentbots = bots.filter(el => el.from != msg.from);
  //     console.log('Bots: ' + currentbots.map(el => el.from));
  //     const i = Math.round(Math.random() * (currentbots.length - 1));
  //     const b = currentbots[i];
  //     const client = clients.get(b.id);
  //     if (b.currentChatId == msg.chatid) {
  //         const msgs = await openai.beta.threads.runs.stream(b.currentThreadId, {
  //             assistant_id: 'asst_NcMJnXsqlSLzGWj7SBgz56at',
  //         }).finalMessages();
  //         for (const m of msgs) {
  //             const c = m.content[0]
  //                 if (c.type == 'text') {
  //                     await client.sendMessage(msg.chatid, {
  //                         message: c.text.value
  //                     })
  //                 }
  //         }
  //         msg.handled = true;
  //         await msgRepo.save(msg);
  //     }

  // });
});
// import { Api, TelegramClient } from "telegram";
// import { AppDataSource } from "./src/data-source";
// import { Bot } from "./src/entity/Bot";
// import cron from 'node-cron';
// import { StringSession } from "telegram/sessions";
// import { NewMessage } from "telegram/events";
// import { ChatMsg } from "./src/entity/ChatMsg";
// import TelegramBot from "node-telegram-bot-api";
// import OpenAI from "openai";
// const openai = new OpenAI({
//     apiKey: process.env.OPENAI_KEY
// });
// const chats: number[] = [
//     -1002202356312,
//     -1002016793708
// ];
// AppDataSource.initialize().then(async () => {
//     const botRepo = AppDataSource.getRepository(Bot);
//     const msgRepo = AppDataSource.getRepository(ChatMsg);
//     const bots = await botRepo.find({
//         where: {
//             blocked: false,
//             progrevat: true
//         }
//     });
//     const manager = new TelegramBot('7461695989:AAHAeqsiW7M15BTmNYRtRlb3VfN7UEJ7I08', {
//         polling: true
//     });
//     manager.onText(/./, async (m) => {
//         console.log(m.chat.id);
//         try {
//             if (chats.includes(m.chat.id)) {
//                 const msg = new ChatMsg();
//                 msg.chatid = String(m.chat.id);
//                 msg.text = m.text;
//                 msg.from = String(m.from.id);
//                 await msgRepo.save(msg);
//                 bots.forEach(async bot => {
//                     console.log(msg.from === bot.from);
//                     if (msg.from === bot.from) return;
//                     await openai.beta.threads.messages.create(bot.currentThreadId, {
//                         role: 'user',
//                         content: m.from.username + ': ' + msg.text
//                     });
//                 });
//             }
//         } catch (e) {

//         }

//     });
//     const clients = new Map<string, TelegramClient>();
//     bots.forEach(async b => {
//         try {
//             const session = new StringSession(b.token);
//             const client = new TelegramClient(session, 28082768, "4bb35c92845f136f8eee12a04c848893", {useWSS: true});
//             await client.start({
//                 async onError(e) {
//                     console.log(e);
//                     return true;
//                 },
//                 phoneCode: async () => '',
//                 phoneNumber: async () => ''
//             })
//             clients.set(b.id, client);
//             client.addEventHandler(async (e) => {
//             }, new NewMessage())
//         } catch (e) {

//         }
//     });
//     manager.onText(/\/on/, (msg) => {
//         bots.forEach(async bot => {
//             bot.currentChatId = msg.text.split(' ')[1];
//             bot.currentThreadId = (await openai.beta.threads.create({
//                 messages: []
//             })).id;
//             await botRepo.save(bot);
//         });
//     });
//     manager.onText(/\/off/, (msg) => {
//         bots.forEach(async bot => {
//             bot.currentChatId = '';
//             await openai.beta.threads.del(bot.currentThreadId);
//             bot.currentThreadId = '';
//             await botRepo.save(bot);
//         });
//     });
//     manager.onText(/\/set/, async  (msg) => {
//         bots.forEach(async bot => {
//             const client = clients.get(bot.id);
//             bot.from = (await client.getMe()).id.toString();
//             await botRepo.save(bot);
//         });
//     });
//     cron.schedule('*/2 * * * *', async () => {
//         const msg = await msgRepo.findOne({
//             where: {
//                 handled: false
//             }
//         });
//         if (!msg) return;
//         const currentbots = bots.filter(el => el.from != msg.from);
//         console.log('Bots: ' + currentbots.map(el => el.from));
//         const i = Math.round(Math.random() * (currentbots.length - 1));
//         const b = currentbots[i];
//         const client = clients.get(b.id);
//         if (b.currentChatId == msg.chatid) {
//             const msgs = await openai.beta.threads.runs.stream(b.currentThreadId, {
//                 assistant_id: 'asst_NcMJnXsqlSLzGWj7SBgz56at',
//             }).finalMessages();
//             for (const m of msgs) {
//                 const c = m.content[0]
//                     if (c.type == 'text') {
//                         await client.sendMessage(msg.chatid, {
//                             message: c.text.value
//                         })
//                     }
//             }
//             msg.handled = true;
//             await msgRepo.save(msg);
//         }

//     });

// });
