import { Column, JoinColumn, ManyToOne, OneToMany, PrimaryColumn } from "typeorm";
import { Lead } from "./Lead";
import { User } from "../User";


export class UserBot {
    @PrimaryColumn()
    token: string;

    @Column({
        nullable: true
    })
    lastSent: Date;

    @OneToMany(() => Lead, (lead) => lead.bot)
    leads: Lead[];

    @ManyToOne(() => User, (user) => user.bots)
    @JoinColumn({
        name: 'userId'
    })
    user: User;


    @Column({
        nullable: true
    })
    userId: string;
}