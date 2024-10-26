import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "./User";
import { Bot } from "./Bot";

@Entity()
export class CascadeUser {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User, (user) => user.cascade)
  @JoinColumn()
  user: User;

  @Column({
    default: false,
  })
  replied: boolean;

  @Column({ default: false })
  finished: boolean;

  @Column({ nullable: true })
  threadId: string;

  @ManyToOne(() => Bot, (bot) => bot.cascades)
  bot: Bot;
}
