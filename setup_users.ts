import fs from "fs"
import path from 'path';
import { Bot } from "./src/entity/Bot";
import { User } from "./src/entity/User";
import { DataSource } from "typeorm";
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
    let data = fs.readFileSync(path.join(__dirname, "signup", "users.txt"), "utf8");
    data = data.replaceAll('@', '').replaceAll('+', '').replaceAll('-', '').replaceAll(' ', '').replaceAll('\'', '');
    if (data.startsWith('8')) data.replace('8', '7');
    const lines = data.split('\n');
    for (let i of lines) {
        if (!i) continue;
        try {
            const user = new WhatsappUser();
            user.phone = i;
            await AppDataSource.getRepository(WhatsappUser).save(user);
        } catch(e) {

        }
    }


});