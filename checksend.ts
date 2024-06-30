import { DataSource } from "typeorm";
import { User } from "./src/entity/User";
import { Bot } from "./src/entity/Bot";
import { Message } from "./src/entity/Message";
import { StringSession } from "telegram/sessions";
import { TelegramClient, client } from "telegram";
import { WhatsappUser } from "./src/entity/WhatsappUser";
import fs from 'fs';
import path from "path";
import { AppDataSource } from "./src/data-source";
const src = new DataSource({
    type: "postgres",
    username: "test",
    password: "test",
    database: "test",
    host: "194.0.194.46",
    entities: [User, Bot, Message, WhatsappUser],
    port: 5432,
    synchronize: true,
    migrations: [],
    subscribers: [],
});

src.initialize().then(async () => {
    const ids = fs.readFileSync(path.join(__dirname, 'signup', 'ids-check.txt'), 'utf8').split('\r\n').map(el => el.replaceAll('"', ''));

    for (const id of ids) {
        if (!id) continue;
        const b = await src.getRepository(Bot).findOne({
            where: {
                id: id
            }
        });

        console.log(b.phone);

    }

    

}).catch(err => console.log(err));

