import OpenAI from 'openai';
import { Api, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
require("dotenv").config();
//@ts-ignore
import input from "input";
import { NewMessage, NewMessageEvent } from 'telegram/events';

const session = new StringSession("1AgAOMTQ5LjE1NC4xNjcuNDEBu62osjpe1sI9qlo3gzZbLIG1i1ZafoyvO0F7j3FoiU8nYve61m1U1p+L0+Bt33b4kyqiaLMOeSpmhyp/VIL3RoQy8AWFeAJJ1wMtr4yeZMDnGvTxNcN9MEHeVs7fRU6u+ZB9LyVOULZYX6eg4D4zL1RzffgLGW4EIHcIh6YS913ShZGcIalEJrKQdrp5hhjFNJX6DzswvjKH5vXyeXwo4qNt6fB/5J41+dqRkTXgDeZ4nZWqNVaUKEAxYCJiKzrsDQzRTabeU+PaTMg1I4Cas8W6RFmIFt8nmk/sLrm66dVH6NuLSpsIo3ETAi6O3VjSR6QBZF2JkagYn8liT9MQ7II=");

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
    const dialogAsst = 'asst_I66lzkKeACqLSCn0Vt5w1ges';

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
        try {
            if (e.isPrivate) {
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
        } catch (e) {
            console.error(e)
        }
        
    }, new NewMessage());
})