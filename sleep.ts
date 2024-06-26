import fs from 'fs';
import path from 'path';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import input from 'input';
import { DataSource } from 'typeorm';
import { User } from './src/entity/User';
import { Bot } from './src/entity/Bot';
import { Message } from './src/entity/Message';


const src = new DataSource({
    type: "postgres",
    username: "test",
    password: "test",
    database: "test",
    host: "194.0.194.46",
    entities: [User, Bot, Message],
    port: 5432,
    synchronize: false,
    migrations: [],
    subscribers: [],
  });
  src.initialize().then(async () => {
    const numbers = fs.readFileSync(path.join(__dirname, 'signup', 'sleep.txt'), 'utf8').split('\n').map(el => el.replace('\r', ''));
    console.log(numbers);
    const bots = await src.getRepository(Bot).find({
        where: {
            blocked: false,
            send: true,
        }
    });
    for (const b of bots) {
        try {
            const session = new StringSession(b.token);
            const client = new TelegramClient(session, 28082768, "4bb35c92845f136f8eee12a04c848893", {useWSS: true});
            await client.start({
                onError(err) {
                    console.log(err);
                },
                phoneCode: async () => { throw new Error; },
                phoneNumber: async () => { throw new Error;},
                password: async () => input.text("Password"),
            }); 
            const phone = (await client.getMe()).phone;
            if (!numbers.includes(phone)) {
                b.send = false;
                await src.getRepository(Bot).save(b);
                console.log(`Found ${phone}`);
            }
            await client.disconnect();
        } catch (err) {
            console.log(err);
        }
    }
  });