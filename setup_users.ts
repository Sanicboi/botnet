import fs from "fs"
import path from 'path';
import { Bot } from "./src/entity/Bot";
import { User } from "./src/entity/User";
import { DataSource } from "typeorm";

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
    let data = fs.readFileSync(path.join(__dirname, "signup", "users.txt"), "utf8");
    data = data.replaceAll('@', '');
    const lines = data.split('\n');
    for (let i of lines) {
        const user = new User();
        user.usernameOrPhone = i;
        await AppDataSource.getRepository(User).save(user);
    }


});