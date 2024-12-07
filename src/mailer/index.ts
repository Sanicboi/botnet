/**
 * This is the mailer bot
 * Input: User
 * Output: Mailer queue
 * Rate limits: No rate limits
 *
 * Functionality:
 * Processes mailing requests
 */

import { Queue } from "bullmq";
import TelegramBot from "node-telegram-bot-api";



const bot = new TelegramBot(process.env.MAILER_TOKEN!, {
    polling: true
});

interface IMailerJob {
    type: 'singlemail';
    to: string;
}

const queue = new Queue<IMailerJob>("mailer", {
    connection: {
        host: 'redis'
    }
});



bot.onText(/\/start/, async msg => {
    // Todo

    console.log("mailer");
    await queue.add('j', {
        to: msg.text?.split(' ')[1]!,
        type: 'singlemail'
    });
});


