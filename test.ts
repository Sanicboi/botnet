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
import { Chat } from "./src/entity/Chat";
//@ts-ignore
import input from 'input';
// import { DataSource } from "typeorm";
// import { User } from "./src/entity/User";
// import { Bot } from "./src/entity/Bot";
// import fs from 'fs';
// import path from 'path';
// import { Bitrix } from "./src/Bitrix";
// const numbers = fs.readFileSync(path.join(__dirname, 'signup', 'numbers.txt'), 'utf8').split('\r\n');

// const src = new DataSource({
//     type: 'postgres',
//     username: 'test',
//     password: 'test',
//     database: 'test',
//     host: '194.0.194.46',
//     entities: [User, Bot, Message, WhatsappUser, Chat, Thread],
//     port: 5432,
//     synchronize: true,
//     migrations: [],
//     subscribers: [],
// });
// src.initialize().then(async () => {
//     const users = await src.getRepository(User).find({
//         where: {
//             sentSpam: true
//         }
//     });
//     for (const u of users) {
//         try {
//             const bot = await src.getRepository(Bot).findOne({
//                 where: {
//                     id: u.botid
//                 }
//             });
//             const session = new StringSession(bot!.token);
//             const client = new TelegramClient(session, 28082768, "4bb35c92845f136f8eee12a04c848893", {
//                 useWSS: true
//             });
//             await client.start({
//                 onError: async () => true,
//                 phoneCode: async () => '',
//                 phoneNumber: async () => ''
//             })
//             let msgs = await client.getMessages(u.usernameOrPhone);
//             msgs = msgs.sort((a, b) => a.date > b.date ? 1 : -1);
//             if (msgs[0].sender!.className === 'User') {
//                 //@ts-ignore
//                     if (msgs[0].sender!.username === u.usernameOrPhone) {
//                         fs.appendFileSync(path.join(__dirname, 'result.txt'), u.usernameOrPhone);
//                     }
//             }
//             await client.disconnect();
//         } catch (err) {
//             console.log(err);
//         }
//     }
// });
    
(async () => {
    const numbers = fs.readFileSync(path.join(__dirname, 'signup', 'bots.txt'), 'utf8').split('\n');


    for (const n of numbers) {
        if (n.length < 6) continue;
        const session = new StringSession("");
        const client = new TelegramClient(session, 28082768, "4bb35c92845f136f8eee12a04c848893", {});
        await client.start({
            phoneNumber: n,
            phoneCode:  () => input.text("Code"),
            onError: async () => true
        });
        //@ts-ignore
        fs.appendFileSync(path.join(__dirname, "signup", "tokens.txt"), client.session.save() + "\n");
    }
})();

//});
 

// src.initialize().then(async () => {
//     const bots = await src.getRepository(Bot).find({
//         where: {
//             blocked: false,
//             send: true
//         }
//     })
//     let amount = 0;
//     for (const b of bots) {
//         try {
//             const session = new StringSession(b.token);
//             const client = new TelegramClient(session, 28082768, "4bb35c92845f136f8eee12a04c848893", {useWSS: true});
//             await client.start({
//                 onError(err) {
//                     console.log(err);
//                 },
//                 phoneCode: async () => input.text("Code"),
//                 phoneNumber: async () =>{ console.log(b.id + ' Blocked'); await client.destroy(); return ''},
//                 password: async () => input.text("Password"),
//             }); 
            
//             const users = await src.getRepository(User).find({
//                 where: {
//                     botid: b.id
//                 }
//             });
//             for (const u of users) {
//                 try {
//                 let result = `\n\nДиалог с ${u.usernameOrPhone}:\n\n`;
//                 const msgs = await client.getMessages(u.usernameOrPhone);
//                 for (const msg of msgs) {
//                     if (msg.sender.className === 'User') {
//                         result += `[${msg.sender.username}]\n${msg.text}`;
//                     }
//                 }
//                 if (msgs.length > 0) fs.appendFileSync(path.join(__dirname, 'export.txt'), result);
//                 await new Promise((resolve, reject) => setTimeout(resolve, 2000))
//                 } catch (e) {

//                 }
//             }
            
            
//             await client.disconnect();
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
