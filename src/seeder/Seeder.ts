import { TelegramClient } from "telegram";
import { Repository } from "typeorm";
import { Chat } from "../entity/Chat";
import { AppDataSource } from "../data-source";
import { Sender } from "./Sender";
import { SmartSender } from "./SmartSender";
import TelegramBot from "node-telegram-bot-api";



export class Seeder {

    private chatRepo: Repository<Chat> = AppDataSource.getRepository(Chat);
    private sender: Sender;
    private smartSender: SmartSender;
    constructor(private clients: Map<string, TelegramClient>, private bot: TelegramBot) {
        this.sender = new Sender(this.clients);
        this.smartSender = new SmartSender(this.sender);
        this.onSeed = this.onSeed.bind(this);
        this.onSeedSmart = this.onSeedSmart.bind(this);
        this.bot.onText(/\/seed/, this.onSeed);
        this.bot.onText(/\/smart/, this.onSeedSmart);
    }


    public async onSeed() {
        const chats = await this.chatRepo.find({
            relations: {
                bots: true
            }
        });
        for (const chat of chats) {
            await this.sender.send(chat.bots[0], 'Соси хуй', chat);
        }
    }

    public async onSeedSmart() {
        const chats = await this.chatRepo.find({
            relations: {
                bots: true
            }
        });
        for (const chat of chats) {
            if (chat.bots.length >= 2) {
                await this.smartSender.sendSmart(chat, chat.bots[0], chat.bots[1], 'Соси хуй', 'Сам соси');
            }
        }
    }
}