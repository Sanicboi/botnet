//@ts-ignore
import input from "input";
import { Api, TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
require("dotenv").config();
import fs from "fs";
import path from "path";
import { CustomFile } from "telegram/client/uploads";

(async () => {
  const tokens = fs
    .readFileSync(path.join(process.cwd(), "data", "tokens.txt"), "utf8")
    .split("\n");

  for (const token of tokens) {
    try {
      if (!token) continue;
      const client = new TelegramClient(
        new StringSession(token),
        +process.env.TG_API_ID!,
        process.env.TG_API_HASH!,
        {
          useWSS: true,
        },
      );

      await client.connect();

      const me = await client.getMe();
      console.log(me.username);
      await client.destroy();
    } catch (err) {
      console.log(err);
    }
  }
})();
