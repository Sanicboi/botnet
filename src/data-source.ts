import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "./entity/User";
import { Assistant } from "./entity/assistants/Assistant";
import { Thread } from "./entity/assistants/Thread";
import { Action } from "./entity/assistants/Action";
import { SupportRequest } from "./entity/SupportRequest";
import { FileUpload } from "./entity/assistants/FileUpload";
import { PromoCode } from "./entity/assistants/Promo";
import { UserPromo } from "./entity/assistants/UserPromo";
import { Channel } from "@grpc/grpc-js";
import { Post } from "./entity/bots/Post";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: "db",
  port: 5432,
  username: "test",
  password: "test",
  database: "test",
  synchronize: true,
  logging: false,
  entities: [
    User,
    Assistant,
    Thread,
    Action,
    SupportRequest,
    FileUpload,
    PromoCode,
    UserPromo,
    Channel,
    Post
  ],
  migrations: [],
  subscribers: [],
});
