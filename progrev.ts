import input from "input";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { DataSource } from "typeorm";
import { User } from "./src/entity/User";
import { Bot } from "./src/entity/Bot";
import { Message } from "./src/entity/Message";
import { WhatsappUser } from "./src/entity/WhatsappUser";
import fs from "fs";
import path from "path";
import { Thread } from "./src/entity/Thread";
import { Chat } from "./src/entity/Chat";

const src = new DataSource({
  type: "postgres",
  username: "test",
  password: "test",
  database: "test",
  host: "194.0.194.46",
  entities: [User, Bot, Message, WhatsappUser, Thread, Chat],
  port: 5432,
  synchronize: false,
  migrations: [],
  subscribers: [],
});


src.initialize().then(async () => {
    const nums = fs.readFileSync(path.join(__dirname, 'signup', 'numbers.txt'), 'utf8').split('\r\n');
    await src
        .getRepository(Bot)
        .createQueryBuilder('bot')
        .update()
        .set({
            progrevat: false
        })
        .execute();
    await src
        .getRepository(Bot)
        .createQueryBuilder('bot')
        .update()
        .where('bot.phone IN (:...arr)', {
            arr: nums
        })
        .set({
            progrevat: true
        })
        .execute();
});
