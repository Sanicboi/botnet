import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from "typeorm";
import OpenAI from "openai";
import { UserPromo } from "./assistants/UserPromo";
import { AudioFile } from "./assistants/AudioFile";
import { AgentModel } from "./AgentModel";
import { Dialog } from "./assistants/Dialog";
import { DialogFile } from "./assistants/DialogFile";


export type UserDataType = 'main' | 'personal' | 'career' | 'business';
export type UserDataTypeMapped = `${UserDataType}Data`;

@Entity()
export class User {
  @PrimaryColumn()
  chatId: string;

  @Column({ default: "n" })
  qt: "n" | "s" | "l" | "d" | "a" | "o";

  @Column({
    type: "text",
    nullable: true,
  })
  threadId: string | null;

  @Column({
    default: false,
  })
  usingVoice: boolean;

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

  @OneToMany(() => DialogFile, (file) => file.user)
  files: DialogFile[];

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
    default: "",
  })
  dialogueData: string; // Per-Dialogue initial data

  @Column({
    default: "",
  })
  waitingForData: '' | UserDataType;

  @Column({
    default: ''
  })
  mainData: string;

  @Column({
    default: ''
  })
  personalData: string;

  @Column({
    default: ''
  })
  businessData: string;

  @Column({
    default: ''
  })
  careerData: string;

  @ManyToOne(() => AgentModel, (agent) => agent.users)
  @JoinColumn({
    name: 'agentId'
  })
  agent: AgentModel;

  @Column()
  agentId: number;

  @OneToMany(() => Dialog, (dialog) => dialog.user)
  dialogs: Dialog[];

  @Column({
    nullable: true
  })
  currentDialogId: number;

}
