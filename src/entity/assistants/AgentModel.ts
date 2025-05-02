import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { AgentGroup } from "./AgentGroup";
import { User } from "../User";
import { Dialog } from "./Dialog";
import { Conversation } from "../Conversation";

@Entity()
export class AgentModel {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column("text", {
    default: "",
  })
  prompt: string;

  @Column("text", {
    default: "",
  })
  firstMessage: string;

  @Column("float", {
    default: 1,
  })
  temperature: number;

  @Column("float", {
    nullable: true,
  })
  topP: number;

  @ManyToOne(() => AgentGroup, (group) => group.agents, {
    onDelete: "CASCADE",
  })
  @JoinColumn({
    name: "groupId",
  })
  group: AgentGroup;

  @OneToMany(() => User, (user) => user.agent)
  users: User[];

  @OneToMany(() => Conversation, (conversation) => conversation.agent)
  conversations: Conversation[];

  @Column()
  groupId: number;

  @Column("text", {
    nullable: true,
  })
  examplePrompt: string | null;
}
