import { DataSource } from "typeorm";
import { User } from "../entity/User";
import { Assistant } from "../entity/assistants/Assistant";
import { Thread } from "../entity/assistants/Thread";
import { Action } from "../entity/assistants/Action";
import { SupportRequest } from "../entity/SupportRequest";
import { FileUpload } from "../entity/assistants/FileUpload";
import { PromoCode } from "../entity/assistants/Promo";
import { UserPromo } from "../entity/assistants/UserPromo";
import { Channel } from "@grpc/grpc-js";
import { Post } from "../entity/bots/Post";
import { Lead } from "../entity/bots/Lead";
import { UserBot } from "../entity/bots/UserBot";
import fs from "fs";
import path from "path";


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
      ],
      migrations: [],
      subscribers: [],
});


(async () => {
    await src.initialize();

    const users = fs.readFileSync(path.join(process.cwd(), "data", "users.txt"), "utf8").split("\n");

    for (const n of users) {
        try {
            if (!n) continue;
            const lead = new Lead();
            lead.username = n.substring(1);
            await src.manager.save(lead);
        } catch (error) {
            console.error(error);
        }
    }

})();