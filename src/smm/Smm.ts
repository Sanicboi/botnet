import TelegramBot from "node-telegram-bot-api";
import { Repository } from "typeorm";
import { SmmUser } from "../entity/SmmUser";
import { AppDataSource } from "../data-source";
import { SmmModel } from "./SmmModel";
import OpenAI from "openai";



export class Smm {

    private bot: TelegramBot = new TelegramBot(process.env.SMM_TOKEN ?? '', {
        polling: true
    });
    private repo: Repository<SmmUser> = AppDataSource.getRepository(SmmUser);
    private model: SmmModel = new SmmModel(this.openai);

    constructor(private openai: OpenAI) {
        this.bot.setMyCommands([
            {
                command: '/start',
                description: 'Начать новый диалог'
            }
        ]);
        this.onText = this.onText.bind(this);
        this.onStart = this.onStart.bind(this);
        this.bot.onText(/./, this.onText);
        this.bot.onText(/\/start/, this.onStart);
    }


    private async onText(msg: TelegramBot.Message) {
        if (!msg.text!.startsWith('/')) {
            const user = await this.repo.findOne({
                where: {
                    id: String(msg.from!.id)
                }
            });
            const response = await this.model.run(user!.threadId, msg.text!);
            for (const message of response) {
                await this.bot.sendMessage(msg.from!.id, message);
            }
        }
    }

    private async onStart(msg: TelegramBot.Message) {
        let user = await this.repo.findOne({
            where: {
                id: String(msg.from!.id)
            }
        });
        if (!user) {
            user = new SmmUser();
            user.id = String(msg.from!.id);
        } else {
            await this.model.deleteThread(user.threadId);
        }
        user.threadId = await this.model.createThread();
        await this.repo.save(user);
    }
}