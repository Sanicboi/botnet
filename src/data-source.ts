import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "./entity/User";
import { Assistant } from "./entity/assistants/Assistant";
import { Thread } from "./entity/assistants/Thread";
import { Action } from "./entity/assistants/Action";
import { SupportRequest } from "./entity/SupportRequest";
import { FileUpload } from "./entity/assistants/FileUpload";
import { Bot } from "./entity/bots/Bot";
import { Lead } from "./entity/bots/Lead";
import { Dialog } from "./entity/bots/Dialog";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: "db",
  port: 5432,
  username: "test",
  password: "test",
  database: "test",
  synchronize: true,
  logging: true,
  entities: [User, Assistant, Thread, Action, SupportRequest, FileUpload, Bot, Lead, Dialog,],
  migrations: [],
  subscribers: [],
});
