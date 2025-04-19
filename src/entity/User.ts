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
import { SupportedModels } from "../utils/Models";
import { OutputFormat } from "../utils/OutputFormat";

export type UserDataType = "main" | "personal" | "career" | "business";
export type UserDataTypeMapped = `${UserDataType}Data`;
export type SubType = "none" | "lite" | "pro" | "premium" | "exclusive";

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

  @Column('text', {
    default: null,
    nullable: true
  })
  currentAudioAgent: 'transcriber' | 'summarizer' | null;

  @Column({
    default: "1024x1024",
  })
  imageRes: "1024x1024" | "1024x1792" | "1792x1024";

  @Column({
    default: "gpt-4o-mini",
  })
  model: SupportedModels;

  @Column({
    default: "none",
  })
  subscription: SubType;

  @Column("timestamp", {
    nullable: true,
  })
  nextPayment: Date | null;

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


  @Column("text", {
    nullable: true,
  })
  paymentMethod: string | null;

  @OneToMany(() => AudioFile, (audio) => audio.user)
  audios: AudioFile[];

  @Column({
    default: "",
  })
  dialogueData: string; // Per-Dialogue initial data

  @Column({
    default: "",
  })
  waitingForData: "" | UserDataType;

  @Column({
    default: "",
  })
  mainData: string;

  @Column({
    default: "",
  })
  personalData: string;

  @Column({
    default: "",
  })
  businessData: string;

  @Column({
    default: "",
  })
  careerData: string;

  @ManyToOne(() => AgentModel, (agent) => agent.users)
  @JoinColumn({
    name: "agentId",
  })
  agent: AgentModel | null;

  @Column('int', {
    nullable: true
  })
  agentId: number | null;

  @OneToMany(() => Dialog, (dialog) => dialog.user)
  dialogs: Dialog[];

  @Column('int', {
    nullable: true,
  })
  currentDialogId: number | null;

  @Column({
    default: "text",
  })
  outputFormat: OutputFormat;
}
