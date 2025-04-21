import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "../User";
import { AgentModel } from "./AgentModel";
import { DialogFile } from "./DialogFile";

@Entity()
export class Dialog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text', {
    default: null,
  })
  lastMsgId: string | null;

  @Column({
    default: "",
  })
  summarizedData: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.dialogs)
  user: User;

  @ManyToOne(() => AgentModel, (agent) => agent.dialogs)
  agent: AgentModel;

  @OneToMany(() => DialogFile, (file) => file.dialog)
  files: DialogFile[];
}
