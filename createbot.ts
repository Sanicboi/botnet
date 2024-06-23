import input from "input";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { DataSource } from "typeorm";
import { User } from "./src/entity/User";
import { Bot } from "./src/entity/Bot";
import { Message } from "./src/entity/Message";
import { WhatsappUser } from "./src/entity/WhatsappUser";

const src = new DataSource({
  type: "postgres",
  username: "test",
  password: "test",
  database: "test",
  host: "194.0.194.46",
  entities: [User, Bot, Message, WhatsappUser],
  port: 5432,
  synchronize: true,
  migrations: [],
  subscribers: [],
});

src.initialize().then(async () => {
  try {
    const session = new StringSession("");
    const client = new TelegramClient(
      session,
      28082768,
      "4bb35c92845f136f8eee12a04c848893",
      { useWSS: true }
    );
    await client.start({
      onError(err) {
        console.log(err);
      },
      phoneCode: async () => input.text("Code"),
      phoneNumber: async () => input.text("Phone Number"),
      password: async () => input.text("Password"),
    });
    const bot = new Bot();
    // @ts-ignore
    bot.token = client.session.save();
    bot.gender = (await input.text("Gender")) == 'm' ? 'male' : 'female';
    console.log(bot.gender);
    await src.getRepository(Bot).save(bot);
    await client.destroy();
  } catch (err) {
    console.log(err);
  }
});
