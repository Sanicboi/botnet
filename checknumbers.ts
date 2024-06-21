import fs from 'fs';
import path from 'path';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import input from 'input';

(async () => {
    const numbers = fs.readFileSync(path.join(__dirname, 'signup', 'numbers.txt'), 'utf8').split('\n');
    for (const n of numbers) {
        try {
            if (!n) continue;
            const session = new StringSession("");
            console.log(n)
            const client = new TelegramClient(session, 28082768, "4bb35c92845f136f8eee12a04c848893", {useWSS: true});
            await client.start({
                onError(err) {
                    console.log(err);
                },
                phoneCode: async () => { throw new Error; },
                phoneNumber: async () => n,
                password: async () => input.text("Password"),
            }); 
            console.log("OK");
            await client.disconnect();
        } catch (err) {
            console.log(err);
        }
    }
})();