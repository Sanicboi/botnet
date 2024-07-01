// import { Api, TelegramClient } from "telegram";
// import { StringSession } from "telegram/sessions";
// import input from 'input';

import axios from "axios";
import { Bitrix } from "./src/Bitrix";
import { Whatsapp } from "./src/Whatsapp";
import OpenAI from "openai";
import { DataSource } from "typeorm";
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
// import { DataSource } from "typeorm";
// import { User } from "./src/entity/User";
// import { Bot } from "./src/entity/Bot";
// import fs from 'fs';
// import path from 'path';
// import { Bitrix } from "./src/Bitrix";

const src = new DataSource({
    type: 'postgres',
    username: 'test',
    password: 'test',
    database: 'test',
    host: '194.0.194.46',
    entities: [User, Bot, Message, WhatsappUser],
    port: 5432,
    synchronize: false,
    migrations: [],
    subscribers: [],
});

src.initialize().then(async () => {
    const bots = await src.getRepository(Bot).find({
        where: {
            blocked: false,
            send: true
        }
    });
    
    for (const b of bots) {
        const session = new StringSession(b.token);
    const client = new TelegramClient(session,28082768, "4bb35c92845f136f8eee12a04c848893", {});

    try {
        await client.start({
            async onError(err) {
                console.log(err);
                return true;
            },
            phoneCode: async () => '',
            phoneNumber: async () =>{ console.log('Blocked ' + b.phone); return ''},
            password: async () => '',
        });
    } catch (e) {
        await client.destroy();
        continue;
    }

    try {
        const dialogs = await client.getDialogs();
        let exp: string[] = [];
        for (const dialog of dialogs) {
            // @ts-ignore
            if (dialog.entity.className !== 'User') continue;
            let result = `Диалог  с ${dialog.entity.username}\n`;
            const m = await client.getMessages(dialog.inputEntity);
            result += m.map(el => el.text).join('\n');
            exp.push(result);
        }
        fs.writeFileSync(path.join(__dirname, `export-${b.phone}.txt`), exp.join('\n\n'));

    } catch (e) {
        console.log(`${b.phone} has it`)
    }
    await client.destroy();
    }



});
 

// src.initialize().then(async () => {
//     const bots = await src.getRepository(Bot).find({
//         where: {
//             blocked: false,
//         }
//     })
//     let amount = 0;
//     for (const b of bots) {
//         try {
//             const session = new StringSession(b.token);
//             const client = new TelegramClient(session, 28082768, "4bb35c92845f136f8eee12a04c848893", {useWSS: true});
//             let blocked = false;
//             await client.start({
//                 onError(err) {
//                     console.log(err);
//                 },
//                 phoneCode: async () => input.text("Code"),
//                 phoneNumber: async () =>{ console.log(b.id + ' Blocked'); await client.destroy(); blocked = true; return ''},
//                 password: async () => input.text("Password"),
//             }); 
            
//             console.log((await client.getMe()).phone)
//             //@ts-ignore
//             const users = (await client.getDialogs()).filter(el => el.isUser === true).filter(el => el.entity.className === 'User').map(el => el.entity).map(el => el.username);
//             console.log(users);
            
//             if (!blocked) await client.disconnect();
//         } catch (err) {
//             console.log(err);
//         }
//     }



// });



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
