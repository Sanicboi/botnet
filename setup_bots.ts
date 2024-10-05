import fs from "fs"
import path from 'path';
import { Bot } from "./src/entity/Bot";
import { DataSource } from "typeorm";
import { User } from "./src/entity/User";
import { WhatsappUser } from "./src/entity/WhatsappUser";
import { AppDataSource } from "./src/data-source";

AppDataSource.initialize().then(async () => {
    const data = fs.readFileSync(path.join(__dirname, "signup", "tokens.txt"), "utf8");

    const lines = data.split('\n');
    for (let token of lines) {
        if (!token) return;
        const bot = new Bot();
        bot.token = token;
        bot.gender = 'male';
        await AppDataSource.getRepository(Bot).save(bot);
    }


});