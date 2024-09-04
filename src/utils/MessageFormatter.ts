import fs from 'fs';
import path from 'path';
import { TelegramClient } from 'telegram';

export class MessgaeFormatter {


    public static async sendTextFromFile(user: string, file: string, client: TelegramClient) {
        const data = fs.readFileSync(path.join(__dirname, 'assets', file), 'utf8');
        await client.sendMessage(user, {
            message: data
        });
    }
}