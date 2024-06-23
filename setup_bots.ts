import fs from "fs"
import path from 'path';
import { Bot } from "./src/entity/Bot";
import { DataSource } from "typeorm";
import { User } from "./src/entity/User";
import { WhatsappUser } from "./src/entity/WhatsappUser";

const AppDataSource = new DataSource({
    type: "postgres",
    host: "194.0.194.46",
    port: 5432,
    username: "test",
    password: "test",
    database: "test",
    synchronize: true,
    logging: false,
    entities: [User, Bot, WhatsappUser],
    migrations: [],
    subscribers: [],
})

AppDataSource.initialize().then(async () => {
    const data = fs.readFileSync(path.join(__dirname, "signup", "ids7.txt"), "utf8");

    const lines = data.split('\n');
    for (let token of lines) {
        if (!token) return;
        const bot = new Bot();
        bot.token = token;
        bot.gender = 'female';
        await AppDataSource.getRepository(Bot).save(bot);
    }


});