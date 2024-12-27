import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "./entity/User";
import { Assistant } from "./entity/assistants/Assistant";
import { Thread } from "./entity/assistants/Thread";
import { Action } from "./entity/assistants/Action";
import { SupportRequest } from "./entity/SupportRequest";
import { FileUpload } from "./entity/assistants/FileUpload";

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
    Bot,
    Lead,
    Dialog,
  ],
  migrations: [],
  subscribers: [],
});
