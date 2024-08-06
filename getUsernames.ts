import fs from 'fs';
import path from 'path';
import { Api, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { DataSource } from 'typeorm';
import { User } from './src/entity/User';
import { Bot } from './src/entity/Bot';
import { Message } from './src/entity/Message';
import { Thread } from './src/entity/Thread';
import { Chat } from './src/entity/Chat';
import { NewMessage } from 'telegram/events';


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
    const users = fs.readFileSync(path.join(__dirname, 'signup', 'users.txt'), 'utf8').replaceAll('\r', '').split('\n');
    const bots = await src.getRepository(Bot).find({
        where: {
            blocked: false,
            phone: '79362119242'
        }
    });
    const b = bots[0];
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

        for (let i = 0; i < users.length; i++) {
            const phone = users[i];
            if (!phone) continue;
            console.log(phone);
            // const entity = await client.getEntity(phone)
            // await client.invoke(new Api.contacts.DeleteByPhones({
            //     phones: [
            //         phone
            //     ]
            // }));
            // client.addEventHandler((e) => {
            //     console.log(e.message.text);
            // }, new NewMessage());
            // await client.sendMessage("SpamBot", {
            //     message: "/start"
            // });
            // const c = await client.invoke(new Api.contacts.AddContact({
            //     firstName: "John",
            //     lastName: "Doe",
            //     phone: "79685232593",
            //     addPhonePrivacyException: true
            // }));
        }
    } catch (err) {
        console.error(err);
    }
});