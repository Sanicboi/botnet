import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { UserBot } from "./UserBot";
import { User } from "../User";

@Entity()
export class Lead {
  @PrimaryColumn()
  username: string;

  @Column({
    nullable: true,
  })
  threadId: string;

  @ManyToOne(() => UserBot, (bot) => bot.leads, {
    nullable: true
  })
  @JoinColumn({
    name: "botId"
  })
  bot: UserBot;

  @Column({
    nullable: true
  })
  botId: string;

  @Column({
    default: false
  })
  responded: boolean;

  @Column({
    default: false
  })
  handled: boolean

  @Column({
    nullable: true
  })
  sentAt: Date;

  // @ManyToOne(() => User, (user) => user.leads)
  // @JoinColumn({
  //   name: "userId",
  // })
  // user: User;

  // @Column()
  // userId: string;
}
