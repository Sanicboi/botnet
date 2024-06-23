import { DataSource } from "typeorm";
import { User } from "./src/entity/User";
import { Bot } from "./src/entity/Bot";
import { Message } from "./src/entity/Message";
import { StringSession } from "telegram/sessions";
import { TelegramClient } from "telegram";
import { AppDataSource } from "./src/data-source";

const src = new DataSource({
    type: "postgres",
    username: "test",
    password: "test",
    database: "test",
    host: "194.0.194.46",
    entities: [User, Bot, Message],
    port: 5432,
    synchronize: true,
    migrations: [],
    subscribers: [],
});

src.initialize().then(async () => {
    const bots = await src.getRepository(Bot).find({
        where: {
            blocked: false
        }
    });

    for (const b of bots) {
        const session = new StringSession(b.token);
        try {
            const client = new TelegramClient(session, 28082768, "4bb35c92845f136f8eee12a04c848893", {useWSS: true});
            let blocked = false;
            await client.start({
                async onError(err) {
                    console.log(err);
                    console.log(`${b.id} is blocked`);
                    blocked = true;
                    return true;
                },
                phoneCode: async () => { 
                    return '';
                 },
                phoneNumber: async () => '',
                password: async () => '',
            });
                b.phone = (await client.getMe()).phone;
                await src.getRepository(Bot).save(b);
            await client.disconnect();
        } catch (e) {
            b.blocked = true;
                await src.getRepository(Bot).save(b);
        }
    }

});;

