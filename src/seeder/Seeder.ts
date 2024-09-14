import { TelegramClient } from "telegram";
import { Repository } from "typeorm";
import { Chat } from "../entity/Chat";
import { AppDataSource } from "../data-source";
import { Sender } from "./Sender";



export class Seeder {

    private chatRepo: Repository<Chat> = AppDataSource.getRepository(Chat);
    private sender: Sender;
    constructor(private clients: Map<string, TelegramClient>) {
        this.sender = new Sender(this.clients);
        this.onSeed = this.onSeed.bind(this);
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
}