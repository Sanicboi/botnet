import fs from 'fs';
import path from 'path';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { DataSource } from 'typeorm';
import { User } from './src/entity/User';
import { Bot } from './src/entity/Bot';
import { Message } from './src/entity/Message';
import { Thread } from './src/entity/Thread';
import { Chat } from './src/entity/Chat';
import { NewMessage, NewMessageEvent } from 'telegram/events';


const src = new DataSource({
    type: "postgres",
    username: "test",
    password: "test",
    database: "test",
    host: "194.0.194.46",
    entities: [User, Bot, Message, Thread, Chat],
    port: 5432,
    synchronize: false,
    migrations: [],
    subscribers: [],
  });
  src.initialize().then(async () => {
    const bots = await src.getRepository(Bot).find({
        where: {
            blocked: false,
        }
    });
    for (const b of bots) {
        const session = new StringSession(b.token);
        const client = new TelegramClient(session, 28082768, "4bb35c92845f136f8eee12a04c848893", {useWSS: true});
        try {
            await client.start({
                async onError(err) {
                    console.log(`Banned ${b.phone}`);
                    return true;
                },
                phoneCode: async () => { throw new Error; },
                phoneNumber: async () => { throw new Error;},
            }); 
            const phone = (await client.getMe()).phone!;
            client.addEventHandler(async (e: NewMessageEvent) => {
                console.log(phone + ": " + e.message.text);
                fs.appendFileSync(path.join(__dirname, 'floods.txt'), phone + ": " + e.message.text + "\n\n");
            }, new NewMessage());
            try {
                await client.sendMessage("SpamBot", {
                    message: "/start"
                })
            } catch (err) {
                console.log(err);
            }
            
        } catch (err) {
            console.log(err);
        }
    }
  });