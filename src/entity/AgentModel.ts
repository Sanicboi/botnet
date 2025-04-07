import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { AgentGroup } from "./AgentGroup";

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
  
  @Column()
  groupId: number;
}
