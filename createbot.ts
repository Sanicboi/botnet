//@ts-ignore
import input from "input";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import fs from 'fs';
import path from 'path';
import { NewMessage, NewMessageEvent } from "telegram/events";
import TelegramBot from "node-telegram-bot-api";

const bots = fs.readFileSync(path.join(__dirname, 'signup', 'tokens.txt'), 'utf8').split('\n');
const b = new TelegramBot('7347879515:AAGfiiuwBzlgFHHASnBnjxkwNPUooFXO3Qc', {
  polling: true
});
(async() => {
  for (const bot of bots) {
    if (!bot) continue;
    const session = new StringSession(bot);
    const client = new TelegramClient(session, 28082768, '4bb35c92845f136f8eee12a04c848893', {});
    try {
      await client.start({
        phoneCode: async () => '',
        phoneNumber: async () => '',
        onError: () => {} 
      });

      client.addEventHandler(async (e: NewMessageEvent)=> {
        try {
          await b.sendMessage(1391491967, e.message.text);
        } catch (error) {
          console.log(error);
        }
      },new NewMessage())
    } catch (error) {
      
    }
  }
})()
