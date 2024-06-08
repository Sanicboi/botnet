import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import fs from "fs";
import path from "path";
import input from "input";
import scheduler from "node-schedule";

const appId = 28082768;
const appHash = '4bb35c92845f136f8eee12a04c848893';
const session = new StringSession("");

(async () => {
    const client = new TelegramClient(session, appId, appHash, {
        
    });
    
    await client.start({
        phoneNumber: async () => {
            //@ts-ignore
            return await input.text("number ?")
        },
        phoneCode: async () => {
            //@ts-ignore
            return await input.text("code ?")
        },
        password: async () => {
            //@ts-ignore
            return await input.text("password ?")
        },
        onError: () => {
            console.error("error");
        }
    });
    // @ts-ignore
    fs.appendFileSync(path.join(__dirname, "ids.txt"), client.session.save() + "\n", "utf-8")
})();