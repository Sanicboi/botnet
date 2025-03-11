import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { DataSource } from "typeorm";
import { UserBot } from "../entity/bots/UserBot.ts";
//@ts-ignore
import input from "input";
require("dotenv").config();

const src = new DataSource({});

src.initilize().then(async () => {
  let number: string = await input.text("Number:");

  while (number != "q") {
    const session = new StringSession("");
    const client = new TelegramClient(session, +process.env.API_ID!, process.env.API_HASH!, {});

    await client.start({
      phoneNumber: number,
      phoneCode: async () => await input.text("Code: "),
      onError: async (err) => true
    });

    const b = new UserBot();
    b.token = await client.session.save();
    await src.manager.save(b);
    await client.destroy();
  }
})
