import { Api, TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import input from 'input';

import { DataSource } from "typeorm";
import { User } from "./src/entity/User";
import { Bot } from "./src/entity/Bot";
import fs from 'fs';
import path from 'path';
import { Bitrix } from "./src/Bitrix";

// const d = fs.
// (async () => {
//     try {
//         const session = new StringSession("1AgAOMTQ5LjE1NC4xNjcuNDEBu4wKJtzHXUUiSU/5S7kv89mkXuDwjltTJpPM95FmlfNTh4/tKukgZ6I8Jc5psjwrUHnu8yWdOTzVkgTEjSoLQlm0E+WGhIZZc9SJR6kWV0gK+eVyp9F4cNLLm0r8CRWr8WMCcS9lTXSSpHOCLnJC2255MNg/sd5iOnowrjaJD8GEe6kUS42jaRsKpj5u8Pvuz2YnkNMhGTZQSt4hyV2aoWc3yeQKq0JiTFvO4fGm45m71aTNu1r5dzsXBAcqUqJh9GfGO7rUb5GdE5xviUoU3bV5P2y79/CyeYLjyoWDSRkknuzmJELWnNuphdWXRYqBaLWqhDJB5yoZ+l5rv7nmp4A=");
//         const client = new TelegramClient(session, 28082768, "4bb35c92845f136f8eee12a04c848893", {useWSS: true});
//         await client.start({
//             onError(err) {
//                 console.log(err);
//             },
//             phoneCode: async () => input.text("Code"),
//             phoneNumber: async () => input.text("Number"),
//             password: async () => input.text("Password"),
//         });
//         console.log(client.getMe());
//         await client.disconnect();
//     } catch (err) {
//         console.log(err);
//     }

Bitrix.createContact('Tesusername', '88005553535', 'Тестовый Контакт').then((contact) => {
    console.log(contact);
});
// })()


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
