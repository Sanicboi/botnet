import { DataSource } from "typeorm";
import { User } from "./src/entity/User";
import { Bot } from "./src/entity/Bot";
import { Message } from "./src/entity/Message";
import { StringSession } from "telegram/sessions";
import { TelegramClient, client } from "telegram";
import { WhatsappUser } from "./src/entity/WhatsappUser";
import { Thread } from "./src/entity/Thread";
import { Client } from "./src/entity/Client";
import { ChatMsg } from "./src/entity/ChatMsg";
import { Chat } from "./src/entity/Chat";

const src = new DataSource({
    type: "postgres",
    username: "test",
    password: "test",
    database: "test",
    host: "194.0.194.46",
    entities: [User, Bot, Message, WhatsappUser, Thread, Client, ChatMsg, Chat],
    port: 5432,
    synchronize: true,
    migrations: [],
    subscribers: [],
});

src.initialize().then(async () => {
    const bots = await src.getRepository(Bot).find({
        where: {
        }
    });

    for (const b of bots) {
        const session = new StringSession(b.token);
        const client = new TelegramClient(session, 28082768, "4bb35c92845f136f8eee12a04c848893", {useWSS: true,
            // proxy: {
            //     ip: '5.42.107.154',
            //     port: 2020,
            //     secret: 'eec1bcb46fcddc05111e7ce92a094c1dae7777772e736f667439382e6972',
            //     MTProxy: true
            // }
        });
        try {


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
            const me = await client.getMe();
                b.phone = me.phone!;
                b.blocked = false;
                b.premium = me.premium!;
                await src.getRepository(Bot).save(b);
            await client.destroy();
        } catch (e) {
            b.blocked = true;
            await src.getRepository(Bot).save(b);
            await client.destroy();
        }
    }

}).catch(err => console.log(err));

