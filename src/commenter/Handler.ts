import { TelegramClient } from "telegram";
import { NewMessageEvent } from "telegram/events";
import { Bot } from "../entity/Bot";
import { Assistant } from "../Assistant";
import { Sender } from "./Sender";
import { Repository } from "typeorm";
import { Channel } from "../entity/Channel";
import { AppDataSource } from "../data-source";


export class Handler {
    private repo: Repository<Channel> = AppDataSource.getRepository(Channel);

    constructor(private clients: Map<string, TelegramClient>, private assistant: Assistant, private sender: Sender) {

    }


    public async onMessage(msg: NewMessageEvent, bot: Bot) {
        if (msg.isChannel) {
            const channel = await this.repo.findOne({
                where: {
                    id: msg.chatId?.toString()
                },
                relations: {
                    commentChannel: {
                        bot: true
                    }
                }
            });
            if (bot.id === channel?.commentChannel.bot.id) {
                const result = await this.assistant.commentPost(msg.message.text);
                for (const m of result) {
                    await this.sender.add({
                        botId: bot.id,
                        channel: channel,
                        comment: m,
                        postId: msg._messageId ?? 0
                    })
                }
            }

        }
    }
}