import { Api, TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import input from 'input';

import { DataSource } from "typeorm";
import { User } from "./src/entity/User";
import { Bot } from "./src/entity/Bot";
import fs from 'fs';
import path from 'path';

(async () => {
    try {
        const session = new StringSession("1AQAOMTQ5LjE1NC4xNzUuNTUBu3by0U0940ZxwDmOGgRsIpDA8SSQtkoPbnOz2vGy2K6G94yhYSiznNFH1KXxBmjjfyb/jUaFyNaVBqMhx+zVsRrcJZAIxWTRWfSO4U2GeYbB3HAbs5RMpNQyvRm5sV4b7ciL4b4one3qfhGIHIrgpVAq0aEzDEMgNTjuGhuevEeU18zTg94FOLfu6aa563o2tTQKUS4fDgiD2unj63/5rwm+nL3QDgE7ZSJKUEZWa6cMaQ/SWGyd4HAbhDIWS2/p0nzHOPYDjepJKYBf2n0MyweCZeQ/MJ1Xms66w4zet+QGh0fVFIyr+GM4t+vCV/gSKtzF7GepA4XyyDXe29rWm24=");
        const client = new TelegramClient(session, 28082768, "4bb35c92845f136f8eee12a04c848893", {useWSS: true});
        await client.start({
            onError(err) {
                console.log(err);
            },
            phoneCode: async () => input.text("Code"),
            phoneNumber: async () => input.text("Number"),
            password: async () => input.text("Password"),
        });
        console.log(client.getMe());
        await client.disconnect();
    } catch (err) {
        console.log(err);
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
