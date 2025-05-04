import { Column, Entity, ManyToOne, OneToMany, PrimaryColumn } from "typeorm";
import { UserPromo } from "./assistants/UserPromo";
import { AudioFile } from "./assistants/AudioFile";
import { AgentModel } from "./assistants/AgentModel";
import { OutputFormat } from "../utils/OutputFormat";
import { AIModel } from "./AIModel";
import { Conversation } from "./Conversation";

export type UserDataType = "main" | "personal" | "career" | "business";
export type UserDataTypeMapped = `${UserDataType}Data`;
export type SubType = "none" | "lite" | "pro" | "premium" | "exclusive";

@Entity()
export class User {
  @PrimaryColumn()
  chatId: string;

  @Column({
    default: false,
  })
  usingImageGeneration: boolean;

  @Column("text", {
    default: null,
    nullable: true,
  })
  currentAudioAgent: "transcriber" | "summarizer" | null;

  @Column({
    default: "1024x1024",
  })
  imageRes: "1024x1024" | "1024x1792" | "1792x1024";

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
    default: false,
  })
  countTokens: boolean;

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
  agent: AgentModel | null;

  @Column({
    default: "text",
  })
  outputFormat: OutputFormat;

  @ManyToOne(() => AIModel, (model) => model.users)
  model: AIModel;

  @ManyToOne(() => Conversation, (conversation) => conversation.user)
  conversations: Conversation[];
}
