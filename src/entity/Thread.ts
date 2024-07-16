import {Column, Entity, JoinColumn, ManyToOne, PrimaryColumn} from 'typeorm';
import { Chat } from './Chat';
import { Bot } from './Bot';

@Entity()
export class Thread {
    @PrimaryColumn()
    id: string;

    @ManyToOne(() => Chat, (chat) => chat.threads)
    chat: Chat;


    @ManyToOne(() => Bot, (bot) => bot.threads)
    bot: Bot;
}