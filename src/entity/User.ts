import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryColumn,
} from "typeorm";
import { Thread } from "./assistants/Thread";
import { Action } from "./assistants/Action";
import OpenAI from "openai";
import { FileUpload } from "./assistants/FileUpload";
import { UserPromo } from "./assistants/UserPromo";
import { UserBot } from "./bots/UserBot";
import { Lead } from "./bots/Lead";
import { AudioFile } from "./assistants/AudioFile";

@Entity()
export class User {
  @PrimaryColumn()
  chatId: string;

  @Column({ default: "n" })
  qt: "n" | "s" | "l" | "d" | "a" | "o";

  @OneToMany(() => Thread, (thread) => thread.user)
  threads: Thread[];

  @ManyToOne(() => Action)
  @JoinColumn({
    name: "actionId",
  })
  action: Action | null;

  @Column({
    nullable: true,
  })
  actionId: string | null;

  @Column({
    default: false,
  })
  usingImageGeneration: boolean;

  @Column({
    default: "1024x1024",
  })
  imageRes: "1024x1024" | "1024x1792" | "1792x1024";

  @Column({
    default: "gpt-4o-mini",
  })
  model: OpenAI.ChatModel;

  @Column({
    default: "none",
  })
  subscription: "none" | "lite" | "pro" | "premium" | "exclusive";

  @Column({
    nullable: true,
  })
  nextPayment?: Date;

  @Column("float", {
    default: 0,
  })
  addBalance: number; // additional balance in Rubles

  @Column("float", {
    default: 0,
  })
  leftForToday: number; // subscription Rubles left for today

  @Column({
    default: "",
  })
  name: string;

  @Column({
    default: false,
  })
  countTokens: boolean;

  @Column({
    default: false,
  })
  waitingForName: boolean;

  @OneToMany(() => FileUpload, (f) => f.user)
  files: FileUpload[];



  @Column({
    default: 0,
  })
  inviteCount: number;

  @OneToMany(() => UserPromo, (promo) => promo.user)
  promos: UserPromo[];

  @Column({
    default: false,
  })
  waitingForPromo: boolean;

  @Column({
    default: false,
  })
  firstCryptoResponse: boolean;

  // @OneToMany(() => UserBot, (bot) => bot.user)
  // bots: UserBot[];

  // @OneToMany(() => Lead, (lead) => lead.user)
  // leads: Lead[];

  @Column({
    default: 10,
  })
  perMailing: number;

  @Column({
    nullable: true,
  })
  paymentMethod: string;


  @OneToMany(() => AudioFile, (audio) => audio.user)
  audios: AudioFile[];

  @Column({
    default: ''
  })
  dialogueData: string; // Per-Dialogue initial data

  @Column({
    default: ''
  })
  addData: string; // Constant data
}
