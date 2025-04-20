import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "./entity/User";
import { SupportRequest } from "./entity/SupportRequest";
import { PromoCode } from "./entity/assistants/Promo";
import { UserPromo } from "./entity/assistants/UserPromo";
import { Channel } from "./entity/bots/Channel";
import { Post } from "./entity/bots/Post";
import { Lead } from "./entity/bots/Lead";
import { UserBot } from "./entity/bots/UserBot";
import { AudioFile } from "./entity/assistants/AudioFile";
import { AgentModel } from "./entity/assistants/AgentModel";
import { AgentGroup } from "./entity/assistants/AgentGroup";
import { Dialog } from "./entity/assistants/Dialog";
import { DialogFile } from "./entity/assistants/DialogFile";

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
    AgentModel,
    AgentGroup,
    User,
    SupportRequest,
    PromoCode,
    UserPromo,
    Channel,
    Post,
    Lead,
    UserBot,
    AudioFile,
    Dialog,
    DialogFile
  ],
  migrations: [],
  subscribers: [],
});
