import { Api, TelegramClient } from "telegram";
import { AppDataSource } from "./src/data-source";
import { Bot } from "./src/entity/Bot";
import cron from 'node-cron';
import { StringSession } from "telegram/sessions";
import { NewMessage } from "telegram/events";
import { ChatMsg } from "./src/entity/ChatMsg";
import TelegramBot from "node-telegram-bot-api";
import OpenAI from "openai";
const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY
});
const chats: number[] = [];
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
    manager.onText(/./, async (m) => {
        if (chats.includes(m.chat.id)) {
            const msg = new ChatMsg();
            msg.chatid = String(m.chat.id);
            msg.text = m.text;
            msg.from = String(m.from.id);
            await msgRepo.save(msg);
            bots.forEach(async bot => {
                if (msg.from === bot.from) return;
                await openai.beta.threads.messages.create(bot.currentThreadId, {
                    role: 'user',
                    content: msg.text
                });
            });
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
    cron.schedule('*/30 * * * * *', async () => {
        const msg = await msgRepo.findOne({
            where: {
                handled: false
            }
        });
        const currentbots = bots.filter(el => el.from !== msg.from);
        const i = Math.round(Math.random() * (currentbots.length - 1));
        const b = currentbots[i];
        const client = clients.get(b.id);
        if (b.currentChatId == msg.chatid) {
            const msgs = await openai.beta.threads.runs.stream(b.currentThreadId, {
                assistant_id: 'asst_NcMJnXsqlSLzGWj7SBgz56at'
            }).finalMessages();
            for (const m of msgs) {
                for (const c of m.content) {
                    if (c.type == 'text') {
                        await client.sendMessage(msg.chatid, {
                            message: c.text.value
                        })
                    }
                }
            }
        }
        
    });

});