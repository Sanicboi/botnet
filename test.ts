import { Api, TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import input from 'input';
import fs from 'fs';
import path from "path";


(async () => {
    try {
        const session = new StringSession("");
        const client = new TelegramClient(session, 28082768, "4bb35c92845f136f8eee12a04c848893", {useWSS: true});
    
        await client.start({
            onError(err) {
                console.log(err);
            },
            phoneCode: async () => input.text("Code"),
            phoneNumber: async () => input.text("Number"),
            password: async () => input.text("Password"),
        });
        console.log(client.session.save());
        await client.disconnect();
    } catch (err) {
        console.log(err);
    }


})()


