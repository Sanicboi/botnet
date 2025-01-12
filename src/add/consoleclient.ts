//@ts-ignore
import input from "input";
import { Api, TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
require("dotenv").config();

(async () => {
  const token = await input.text("Введите токен:");
  const client = new TelegramClient(
    new StringSession(token),
    +process.env.TG_API_ID!,
    process.env.TG_API_HASH!,
    {
      useWSS: true,
    },
  );

  await client.connect();

  let command = "";
  while (command !== "quit") {
    if (command === "join") {
      const chat = await input.text("Channel or Chat name:");
      await client.invoke(
        new Api.channels.JoinChannel({
          channel: chat,
        }),
      );
    }

    if (command === "dialogs") {
      const dialogs = await client.getDialogs();
      for (const dialog of dialogs) {
        console.log(
          `${dialog.entity?.className} ${dialog.entity?.id.toJSON()}`,
        );
      }
    }

    command = await input.text("Command:");
  }
})();
