import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Bot } from "./Bot";
import { User } from "./User";


@Entity()
export class SpamUser {


    @PrimaryGeneratedColumn()
    id: number;

    @OneToOne(() => User, (user) => user.spam)
    @JoinColumn()
    user: User;

    @Column({
        default: false
    })
    replied: boolean;

    @ManyToOne(() => Bot, (bot) => bot.spams)
    bot: Bot;
}