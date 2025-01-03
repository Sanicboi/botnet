import OpenAI from 'openai';
import { Api, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
require("dotenv").config();
//@ts-ignore
import input from "input";
import { NewMessage, NewMessageEvent } from 'telegram/events';

const session = new StringSession("1AgAOMTQ5LjE1NC4xNjcuNDEBu0mDkxnXZF3kOwHNDlECuHAfCM8V2pdajGaJAjFk1KSy4rAdYFrDQT/9WT9utGk9C73yDfFNKsc84yMVj71JP5nPYRE9/MGFsQKlvmcPziF05Cx/Zk2kn/0ny6QZoPKQcaZ1PFEyJmpM/d6NN78DeHHwO2ltTPNl4mjfMWs9vyeqZVT/kFQaQoVBLtqx3+vLT1zNSnDwRVqPwI4F3hWO6xDISBNnYiSeY40a6vOAasYoFY4aC2Cumug7S4/khVNJWGvTMGm0bOxv7gps1n7YiNSz6LVt5RXBioPUu8/MA+HOPx0m0t9TiJ/h+1CLBMplJZaoNJpSiFXK+PxTDHS5OjU=");

const client = new TelegramClient(session, Number(process.env.TG_API_ID!), process.env.TG_API_HASH!, {
    useWSS: true
});

const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY
});

client.start({
    async onError(err) {
        console.log(err);
        return true;
    },
    phoneNumber: '88005553535',
    phoneCode: async () => '123'
}).then(async () => {
    let username: string = await input.text("Username to send to:");
    const full = await client.invoke(new Api.users.GetFullUser({
        id: username
    }));
    const firstMessageAsst = 'asst_pcWdHxrp1xlaqkBStSCCpnHy';
    const dialogAsst = '';

    const firstMsgThread = await openai.beta.threads.create();
    await openai.beta.threads.messages.create(firstMsgThread.id, {
        content: `Создай сообщение. Ты не знаешь имени пользователя.`,
        role: 'user'
    });
    const msgs = await openai.beta.threads.runs.stream(firstMsgThread.id, {
        assistant_id: firstMessageAsst
    }).finalMessages();
    if (msgs[0].content[0].type !== 'text') return;
    await client.sendMessage(username, {
        message: msgs[0].content[0].text.value
    });
    const th = await openai.beta.threads.create();
    await openai.beta.threads.messages.create(th.id, {
        content: msgs[0].content[0].text.value,
        role: 'assistant'
    });

    client.addEventHandler(async (e: NewMessageEvent) => {
        if (e.message.sender?.className === 'User') {
            if (e.message.sender.username === username) {
                await client.invoke(new Api.messages.ReadHistory({
                    peer: username
                }));
                await client.invoke(new Api.messages.SetTyping({
                    action: new Api.SendMessageTypingAction(),
                    peer: username,
                }))
                await openai.beta.threads.messages.create(th.id, {
                    content: e.message.text,
                    role: 'user'
                });
                const msgs = await openai.beta.threads.runs.stream(th.id, {
                    assistant_id: dialogAsst
                }).finalMessages();
                for (const msg of msgs) {
                    if (msg.content[0].type === 'text') {
                        await client.sendMessage(username, {
                            message: msg.content[0].text.value
                        })
                    }
                }
            }
        }
    }, new NewMessage());
})