import { Entity, Column, OneToMany, PrimaryColumn, ManyToMany } from "typeorm";
import { Bot } from "./Bot";
@Entity()
export class Chat {
  @PrimaryColumn()
  id: string;

  @ManyToMany(() => Bot, (bot) => bot.chats)
  bots: Bot[];
}
