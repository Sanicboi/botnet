import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { CascadeUser } from "./CascadeUser";
import { SpamUser } from "./SpamUser";
import { CommentChannel } from "./CommentChannel";
import { Chat } from "./Chat";

@Entity()
export class Bot {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ nullable: true })
  token: string;

  @Column({ default: false })
  blocked: boolean;

  @Column({ default: true })
  send: boolean;

  @Column({ default: "male" })
  gender: "male" | "female";

  @Column({ default: "" })
  phone: string;

  @Column({ default: "" })
  currentChatId: string;

  @Column({ default: "" })
  currentThreadId: string;

  @Column({ default: "" })
  from: string;

  @Column({ default: false })
  progrevat: boolean;

  @Column({ default: false })
  premium: boolean;

  @Column({ default: 0 })
  queueIdx: number;

  @Column({ default: 0 })
  sentMsgs: number;

  @OneToMany(() => CascadeUser, (cascadeUser) => cascadeUser.bot)
  cascades: CascadeUser[];

  @OneToMany(() => SpamUser, (spamUser) => spamUser.bot)
  spams: SpamUser[];

  @OneToMany(() => CommentChannel, (c) => c.bot)
  comments: CommentChannel[];

  @ManyToMany(() => Chat, (chat) => chat.bots)
  @JoinTable()
  chats: Chat[];
}
