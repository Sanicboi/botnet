import "reflect-metadata"
import { DataSource } from "typeorm"
import { User } from "./entity/User"
import { Bot } from "./entity/Bot"
import { Message } from "./entity/Message"
import { WhatsappUser } from "./entity/WhatsappUser"
import { Chat } from "./entity/Chat"
import { Client } from "./entity/Client"
import { Channel } from "./entity/Channel"
import { CommentChannel } from "./entity/CommentChannel"
import { CascadeUser } from "./entity/CascadeUser"
import { SpamUser } from "./entity/SpamUser"
import { SmmUser } from "./entity/SmmUser"

export const AppDataSource = new DataSource({
    type: "postgres",
    host: "db",
    port: 5432,
    username: "test",
    password: "test",
    database: "test",
    synchronize: true,
    logging: false,
    entities: [User, Bot, Message, WhatsappUser, Chat, Client, Channel, CommentChannel, CascadeUser, SpamUser, SmmUser],
    migrations: [],
    subscribers: [],
})
