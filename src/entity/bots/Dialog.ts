import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { Bot } from "./Bot";
import { Lead } from "./Lead";

@Entity()
export class Dialog {
  @PrimaryColumn()
  threadId: string;

  @ManyToOne(() => Bot, (bot) => bot.dialogs)
  @JoinColumn({
    name: "botId",
  })
  bot: Bot;

  @Column()
  botId: string;

  @ManyToOne(() => Lead, (lead) => lead.dialogs)
  @JoinColumn({
    name: "leadId",
  })
  lead: Lead;

  @Column()
  leadId: string;
}
