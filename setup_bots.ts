import fs from "fs"
import path from 'path';
import { Bot } from "./src/entity/Bot";
import { DataSource } from "typeorm";
import { User } from "./src/entity/User";

const AppDataSource = new DataSource({
    type: "postgres",
    host: "localhost",
    port: 5432,
    username: "test",
    password: "test",
    database: "test",
    synchronize: true,
    logging: false,
    entities: [User, Bot],
    migrations: [],
    subscribers: [],
})

AppDataSource.initialize().then(async () => {
    const data = fs.readFileSync(path.join(__dirname, "signup", "ids.txt"), "utf8");

    const lines = data.split('\n');
    for (let token of lines) {
        const bot = new Bot();
        bot.token = token;
        await AppDataSource.getRepository(Bot).save(bot);
    }


});