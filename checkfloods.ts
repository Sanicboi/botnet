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
            send: true,
        }
    });
    const errors: string[] = [];
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
            try {
                await client.sendMessage("Sanicboii", {
                    message: "Проверка на предупреждения"
                })
            } catch (err) {
                errors.push(phone);
            }
            await client.destroy();
        } catch (err) {
            console.log(err);
            b.blocked = true;
            await src.getRepository(Bot).save(b);
            await client.destroy();
        }
    }
    console.log(errors);
  });