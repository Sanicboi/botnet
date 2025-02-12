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

  @ManyToOne(() => UserBot, (bot) => bot.leads)
  @JoinColumn({
    name: "botId",
  })
  bot: UserBot;

  @Column()
  botId: string;

  @Column({
    default: false
  })
  responded: boolean;

  // @ManyToOne(() => User, (user) => user.leads)
  // @JoinColumn({
  //   name: "userId",
  // })
  // user: User;

  // @Column()
  // userId: string;
}
