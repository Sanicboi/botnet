import "reflect-metadata"
import { DataSource } from "typeorm"
import { User } from "./entity/User"
import { Bot } from "./entity/Bot"
import { Message } from "./entity/Message"

export const AppDataSource = new DataSource({
    type: "postgres",
    host: "db",
    port: 5432,
    username: "test",
    password: "test",
    database: "test",
    synchronize: true,
    logging: false,
    entities: [User, Bot, Message],
    migrations: [],
    subscribers: [],
})
