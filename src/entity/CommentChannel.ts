import { Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Bot } from "./Bot";
import { User } from "./User";
import { Channel } from "./Channel";


@Entity()
export class CommentChannel {

    @PrimaryGeneratedColumn()
    id: number;

    @OneToOne(() => Channel, (channel) => channel.commentChannel)
    @JoinColumn()
    channel: Channel;

    @ManyToOne(() => Bot, (bot) => bot.comments)
    bot: Bot;
}