import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { FileUpload } from "./FileUpload";
import { User } from "./User";
import { supportedAPIs } from "../neuro/apis/supportedModels";
import { AgentModel } from "./assistants/AgentModel";

@Entity()
export class Conversation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    default: "",
  })
  apiId: string;

  @Column()
  api: supportedAPIs;

  @Column({
    default: true,
  })
  active: boolean;

  @Column({
    default: false,
  })
  featured: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => FileUpload, (file) => file.conversation)
  files: FileUpload[];

  @Column({
    default: 0,
  })
  msgCount: number;

  @ManyToOne(() => AgentModel, (agent) => agent.conversations)
  agent: AgentModel;

  @ManyToOne(() => User, (user) => user.conversations)
  user: User;
}
