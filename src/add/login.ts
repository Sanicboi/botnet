import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { DataSource } from "typeorm";
//@ts-ignore
import input from "input";
require("dotenv").config();

const src = new DataSource({});

src.initilize().then(async () => {
  let number: string = await input.text("Number:");

  while (number != "q") {
    const session = new StringSession("");
    const client = new TelegramClient(session, +process.env.API_ID!, process.env.API_HASH!, {});
  }
})
