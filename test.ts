import { Api, TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import input from 'input';

import { DataSource } from "typeorm";
import { User } from "./src/entity/User";
import { Bot } from "./src/entity/Bot";
import fs from 'fs';
import path from 'path';
import { Bitrix } from "./src/Bitrix";

const d = fs.readFileSync(path.join(__dirname, 'signup', 'ids5.txt'), 'utf8');
(async () => {
    const tkns = d.split('\n');
    for (const t of tkns) {
        if (!t) break;
        try {
            console.log(t);
            const session = new StringSession(t);
            const client = new TelegramClient(session, 28082768, "4bb35c92845f136f8eee12a04c848893", {useWSS: true});
            await client.start({
                onError(err) {
                    console.log(err);
                },
                phoneCode: async () => input.text("Code"),
                phoneNumber: async () => input.text("Number"),
                password: async () => input.text("Password"),
            });
            console.log((await client.getDialogs()).map(el => el.message.text));
            await client.disconnect();
        } catch (err) {
            console.log(err);
        }
    }


})()



// const src = new DataSource({
//     type: 'postgres',
//     username: 'test',
//     password: 'test',
//     database: 'test',
//     host: '194.0.194.46',
//     entities: [User, Bot],
//     port: 5432,
//     synchronize: false,
//     migrations: [],
//     subscribers: [],
// });

// src.initialize().then(async () => {
//     const names = fs.readFileSync(path.join(__dirname, 'signup', 'ids4.txt'), 'utf8').split('\n');
//     for (const name of names) {
//         const b = new Bot();
//         b.token = name;
//         await src.getRepository(Bot).save(b);
//     }
// })
