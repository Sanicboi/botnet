import { Api, TelegramClient } from "telegram";
import { AppDataSource } from "./src/data-source";
import { Bot } from "./src/entity/Bot";
import cron from 'node-cron';
import { StringSession } from "telegram/sessions";
import { NewMessage } from "telegram/events";
import { ChatMsg } from "./src/entity/ChatMsg";
import TelegramBot from "node-telegram-bot-api";
import OpenAI from "openai";
import { Queue, Worker } from "bullmq";
const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY
});
const chats: number[] = [
    -1002202356312,
    -1002016793708
];
const outq = new Queue('p-out', {
    connection: {
        host: 'redis'
    }
});
const inq = new Queue('p-in', {
    connection: {
        host: 'redis'
    }
});



AppDataSource.initialize().then(async () => {
    const botRepo = AppDataSource.getRepository(Bot);
    const msgRepo = AppDataSource.getRepository(ChatMsg);
    const bots = await botRepo.find({
        where: {
            blocked: false,
            progrevat: true
        }
    });
    const manager = new TelegramBot('7461695989:AAHAeqsiW7M15BTmNYRtRlb3VfN7UEJ7I08', {
        polling: true
    });

    const outw = new Worker('p-out', async (job) => {
        console.log('Out job')
        const client = clients.get(job.data.bot.id);
        const msgs = (await openai.beta.threads.runs.stream(job.data.bot.threadId, {
            assistant_id: 'asst_NcMJnXsqlSLzGWj7SBgz56at'
        }).finalMessages())
        for (const m of msgs) {
            await client.sendMessage(job.data.msg.chatid, {
                //@ts-ignore
                message: m.content[0].text.value
            });
            await new Promise((resolve, reject) => setTimeout(resolve, 1000));
        }
        job.data.bot.quota--;
        await botRepo.save(job.data.bot);
    }, {
        limiter: {
            duration: 10000,
            max: 1
        },
        connection: {
            host: 'redis'
        },
        concurrency: 1
    });
    
    const inw = new Worker('p-in', async (job) => {
        console.log('In job');
        bots.forEach(async bot => {
            console.log(job.data.msg.from === bot.from);
            if (job.data.msg.from === bot.from) return;
            await openai.beta.threads.messages.create(bot.currentThreadId, {
                role: 'user',
                content: job.data.username + ': ' + job.data.msg.text
            });
        });
        const eligible = bots.filter(el => el.from !== job.data.msg.from).filter(el => el.quota > 0);
        const i = Math.round(Math.random() * (eligible.length - 1));
        const client = clients.get(eligible[i].id);
        await outq.add('send', {
            msg: job.data.msg,
            bot: eligible[i],
        })
    }, {
        connection: {
            host: 'redis'
        },
        concurrency: 1
    });

    manager.onText(/./, async (m) => {
        try {
            if (chats.includes(m.chat.id)) {
                const msg = new ChatMsg();
                msg.chatid = String(m.chat.id);
                msg.text = m.text;
                msg.from = String(m.from.id);
                await msgRepo.save(msg);
                await inq.add('handle', {msg});
            }
        } catch (e) {
            
        }

    });
    const clients = new Map<string, TelegramClient>();
    bots.forEach(async b => {
        try {
            const session = new StringSession(b.token);
            const client = new TelegramClient(session, 28082768, "4bb35c92845f136f8eee12a04c848893", {useWSS: true});
            await client.start({
                async onError(e) {
                    console.log(e);
                    return true;
                },
                phoneCode: async () => '',
                phoneNumber: async () => ''
            })
            clients.set(b.id, client);
            client.addEventHandler(async (e) => {
            }, new NewMessage())
        } catch (e) {

        }
    });
    manager.onText(/\/on/, (msg) => {
        bots.forEach(async bot => {
            bot.currentChatId = msg.text.split(' ')[1];
            bot.currentThreadId = (await openai.beta.threads.create({
                messages: []
            })).id;
            await botRepo.save(bot);
        });
    });
    manager.onText(/\/off/, (msg) => {
        bots.forEach(async bot => {
            bot.currentChatId = '';
            await openai.beta.threads.del(bot.currentThreadId);
            bot.currentThreadId = '';
            await botRepo.save(bot);
        });
    });
    manager.onText(/\/set/, async  (msg) => {
        bots.forEach(async bot => {
            const client = clients.get(bot.id);
            bot.from = (await client.getMe()).id.toString();
            await botRepo.save(bot);
        });
    });
    manager.onText(/\/restart/, async (msg) => {
        bots.forEach(async bot => {
            bot.quota = 4;
            await botRepo.save(bot);
        });
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