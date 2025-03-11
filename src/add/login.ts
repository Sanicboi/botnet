import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { DataSource } from "typeorm";
import { UserBot } from "../entity/bots/UserBot";
//@ts-ignore
import input from "input";

import { Action } from "../entity/assistants/Action";
import { Assistant } from "../entity/assistants/Assistant";
import { AudioFile } from "../entity/assistants/AudioFile";
import { FileUpload } from "../entity/assistants/FileUpload";
import { PromoCode } from "../entity/assistants/Promo";
import { Thread } from "../entity/assistants/Thread";
import { UserPromo } from "../entity/assistants/UserPromo";
import { Channel } from "../entity/bots/Channel";
import { Lead } from "../entity/bots/Lead";
import { Post } from "../entity/bots/Post";
import { SupportRequest } from "../entity/SupportRequest";
import { User } from "../entity/User";
require("dotenv").config();

const src = new DataSource({
  type: "postgres",
  host: "localhost",
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
    Post,
    Lead,
    UserBot,
    AudioFile
  ]
});

src.initialize().then(async () => {
  let number: string = await input.text("Number:");

  while (number != "q") {
    const session = new StringSession("");
    const client = new TelegramClient(session, +process.env.TG_API_ID!, process.env.TG_API_HASH!, {});

    await client.start({
      phoneNumber: number,
      phoneCode: async () => await input.text("Code: "),
      onError: async (err) => true
    });

    const b = new UserBot();
    b.token = client.session.save()!;
    await src.manager.save(b);
    await client.destroy();
    number = await input.text("Number:");
  }
})
