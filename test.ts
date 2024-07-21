// import { Api, TelegramClient } from "telegram";
// import { StringSession } from "telegram/sessions";
// import input from 'input';

import axios from "axios";
import { Bitrix } from "./src/Bitrix";
import { Whatsapp } from "./src/Whatsapp";
import OpenAI from "openai";
import { DataSource, IsNull, Not } from "typeorm";
import { User } from "./src/entity/User";
import { Bot } from "./src/entity/Bot";
import { Message } from "./src/entity/Message";
import { WhatsappUser } from "./src/entity/WhatsappUser";
import TelegramBot from "node-telegram-bot-api";
import { Determiner } from "./src/determiner";
import fs from 'fs';
import path from "path";
import { Api, TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { TotalList } from "telegram/Helpers";
import input from 'input'
import { Chat } from "./src/entity/Chat";
import { Thread } from "./src/entity/Thread";
// import { DataSource } from "typeorm";
// import { User } from "./src/entity/User";
// import { Bot } from "./src/entity/Bot";
// import fs from 'fs';
// import path from 'path';
// import { Bitrix } from "./src/Bitrix";
// const numbers = fs.readFileSync(path.join(__dirname, 'signup', 'numbers.txt'), 'utf8').split('\r\n');

const src = new DataSource({
    type: 'postgres',
    username: 'test',
    password: 'test',
    database: 'test',
    host: '194.0.194.46',
    entities: [User, Bot, Message, WhatsappUser, Chat, Thread],
    port: 5432,
    synchronize: true,
    migrations: [],
    subscribers: [],
});
// process.env.WEBHOOK_URL = 'https://adamart.bitrix24.ru/rest/39/w0654aqejhhe6zdi/'
// src.initialize().then(async () => {
//     const users = await src.getRepository(User).find({
//         where: {
//             replied: true
//         }
//     });
//     for (const u of users) {
//         try {
//             await Bitrix.addContact(u.contactId, u.dealId);
//             await new Promise((resolve, reject) => setTimeout(resolve, 500))
//         } catch (err) {
//             console.log(err);
//         }
//     }
// });
    


//});
 

src.initialize().then(async () => {
    const bots = await src.getRepository(Bot).find({
        where: {
            blocked: false,
            send: true
        }
    })
    let amount = 0;
    for (const b of bots) {
        try {
            const session = new StringSession(b.token);
            const client = new TelegramClient(session, 28082768, "4bb35c92845f136f8eee12a04c848893", {useWSS: true});
            await client.start({
                onError(err) {
                    console.log(err);
                },
                phoneCode: async () => input.text("Code"),
                phoneNumber: async () =>{ console.log(b.id + ' Blocked'); await client.destroy(); return ''},
                password: async () => input.text("Password"),
            }); 
            
            const users = await src.getRepository(User).find({
                where: {
                    botid: b.id
                }
            });
            for (const u of users) {
                try {
                let result = `\n\nДиалог с ${u.usernameOrPhone}:\n\n`;
                const msgs = await client.getMessages(u.usernameOrPhone);
                for (const msg of msgs) {
                    if (msg.sender.className === 'User') {
                        result += `[${msg.sender.username}]\n${msg.text}`;
                    }
                }
                if (msgs.length > 0) fs.appendFileSync(path.join(__dirname, 'export.txt'), result);
                await new Promise((resolve, reject) => setTimeout(resolve, 2000))
                } catch (e) {

                }
            }
            
            
            await client.disconnect();
        } catch (err) {
            console.log(err);
        }
    }



});



// // const src = new DataSource({
// //     type: 'postgres',
// //     username: 'test',
// //     password: 'test',
// //     database: 'test',
// //     host: '194.0.194.46',
// //     entities: [User, Bot],
// //     port: 5432,
// //     synchronize: false,
// //     migrations: [],
// //     subscribers: [],
// // });

// // src.initialize().then(async () => {
// //     const names = fs.readFileSync(path.join(__dirname, 'signup', 'ids4.txt'), 'utf8').split('\n');
// //     for (const name of names) {
// //         const b = new Bot();
// //         b.token = name;
// //         await src.getRepository(Bot).save(b);
// //     }
// // })

// import Openai from 'openai';

// const openai = new Openai({
//     
// })

// openai.beta.threads.messages.list('thread_Ru4sC4g3cIXFpXTEvqbOXkxG').then((v) => {
//     console.log(v.data.map(el => el.content[0]));
// })
