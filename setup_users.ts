import fs from "fs"
import path from 'path';
import { Bot } from "./src/entity/Bot";
import { User } from "./src/entity/User";
import { DataSource } from "typeorm";
import { WhatsappUser } from "./src/entity/WhatsappUser";
import { Thread } from "./src/entity/Thread";
import { Client } from "./src/entity/Client";
import { Chat } from "./src/entity/Chat";

const AppDataSource = new DataSource({
    type: "postgres",
    host: "194.0.194.46",
    port: 5432,
    username: "test",
    password: "test",
    database: "test",
    synchronize: true,
    logging: false,
    entities: [User, Bot, Thread, Client, Chat],
    migrations: [],
    subscribers: [],
})

AppDataSource.initialize().then(async () => {
    let data = fs.readFileSync(path.join(__dirname, "signup", "users.txt"), "utf8");
    data = data.replaceAll('@', '');
    const lines = data.split('\n');
    for (let i of lines) {
        if (!i) continue;
        try {
            const user = new User();
            user.usernameOrPhone = i;
            await AppDataSource.getRepository(User).save(user);
        } catch(e) {

        }
    }


});