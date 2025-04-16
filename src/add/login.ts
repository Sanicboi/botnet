import { TelegramClient } from "telegram";
import path from "path";
import fs from "fs";
import { AppDataSource } from "../data-source";
import { StringSession } from "telegram/sessions";
//@ts-ignore
import input from "input";
import { UserBot } from "../entity/bots/UserBot";
require("dotenv").config();

AppDataSource.initialize().then(async () => {
  const numbers = fs
    .readFileSync(path.join(process.cwd(), "data", "nums.txt"), "utf-8")
    .split("\n");
  for (const n of numbers) {
    try {
      if (!n) continue;
      const session = new StringSession();
      const client = new TelegramClient(
        session,
        +process.env.TG_API_ID!,
        process.env.TG_API_HASH!,
        {},
      );

      await client.start({
        phoneNumber: n,
        async onError(err) {
          console.error(err);
          return true;
        },
        phoneCode: async () => await input.text("Code:"),
      });

      const bot = new UserBot();
      bot.token = client.session.save()!;
      await AppDataSource.manager.save(bot);
      await client.destroy();
    } catch (error) {
      console.error(error);
    }
  }
});
