import { TelegramClient } from "telegram";
import { Handler } from "./Handler";
import { Sender } from "./Sender";
import { Assistant } from "../Assistant";
import { NewMessageEvent } from "telegram/events";
import { Bot } from "../entity/Bot";


export class Commenter {

    private handler: Handler;
    private sender: Sender;

    constructor(private clients: Map<string, TelegramClient>, private assistant: Assistant) {
        this.sender = new Sender(this.clients);
        this.handler = new Handler(this.clients, this.assistant, this.sender);
        this.onMessage = this.onMessage.bind(this);
    }

    public async onMessage(msg: NewMessageEvent, bot: Bot) {
        console.log(msg);
        await this.handler.onMessage(msg, bot);
    }
}