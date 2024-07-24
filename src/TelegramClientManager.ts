import { TelegramClient } from "telegram";
import { UnknownError } from "./utils/Errors";
import TelegramBot from "node-telegram-bot-api";
import { Repository } from "typeorm";
import { Bot } from "./entity/Bot";
import { AppDataSource } from "./data-source";
import { StringSession } from "telegram/sessions";
import { NewMessage, NewMessageEvent } from "telegram/events";

type NewMessageHandler = (event: NewMessageEvent) => Promise<void>;
type HandlerFactory = (bot: Bot) =>  NewMessageHandler;

export class TelegramCLientManager {
    private clients: Map<string, TelegramClient> = new Map();   
    private botRepo: Repository<Bot> = AppDataSource.getRepository(Bot);
    private initialized: boolean = false;
    constructor(private reporter: TelegramBot, private factory: HandlerFactory) {

    }

    public async initialize(): Promise<void> {
        if (!this.initialized) {
            this.initialized = true;
            const bots = await this.botRepo.find({
                where: {
                    blocked: false,
                }
            });
            for (const b of bots) {
                const session = new StringSession(b.token);
                const client = new TelegramClient(session, Number(process.env.API_ID), process.env.API_HASH ?? '', {
                    useWSS: true,
                    proxy: {
                        ip: '168.119.105.241',
                        port: 443,
                        secret: 'ee3acd99ac8ce70af51822b66f4774513473332e616d617a6f6e6177732e636f6d'
                    }
                });
                try {
                    await client.start({
                        onError: async (e) => true,
                        phoneNumber: async () => "",
                        phoneCode: async () => ""
                    });
                    client.addEventHandler(this.factory(b), new NewMessage())
                } catch (err) {

                }
                this.clients.set(b.id, client);
            }
        }
    }


    public getClient(id: string): TelegramClient {
        const c = this.clients.get(id);
        if (!c) throw new UnknownError("Trying to get a client by the wrong id", "ClientManager", this.reporter);
        return c;
    }
}