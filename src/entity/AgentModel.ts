import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { AgentGroup } from "./AgentGroup";
import { User } from "./User";
import { Dialog } from "./assistants/Dialog";

@Entity()
export class AgentModel {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column("text")
  prompt: string;

  @Column("text")
  firstMessage: string;

  @Column("float")
  temperature: number;

  @Column("float")
  topP: number;

  @ManyToOne(() => AgentGroup, (group) => group.agents)
  @JoinColumn({
    name: "groupId"
  })
  group: AgentGroup;

  @OneToMany(() => User, (user) => user.agent)
  users: User[];

  @OneToMany(() => Dialog, (dialog) => dialog.agent)
  dialogs: Dialog[];
  
  @Column()
  groupId: number;
}
