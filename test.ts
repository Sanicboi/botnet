import { Api, TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import input from 'input';
import fs from 'fs';
import path from "path";


(async () => {
    try {
        const session = new StringSession("1AgAOMTQ5LjE1NC4xNjcuNDEBuytj3fYVjfEnj1dCN/xDiQP5fdCfgmCvIbDy00j0tdezXPwBoVxYhkLIe7yz/8w8kdOex8n6PN36G+CAksookR6tDxLMk3ZAnNtnKoqLc7uyaYkphITzVwrYKTkIbAvJhZsHh8cgf24JgcoiHroOujDWDIhj7JPUY/yAbUEWTig9V2bMDSAWKUNWhCeg3RQMmFtjM3r5L4bB1ayRLFY58K0e7yKmVVgRbU8gtRy5i7vsNIligpnKYUbkuEKa5sPL7U59LIs6CpTk6LLe+EaQJ2NIWJAZGY4eTV8cgYLcSxXJLGPYecjriD+qLFQaLN3ObmcJcgaQsZagr7Igjuao7RY=");
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


