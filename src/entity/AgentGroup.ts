import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { AgentModel } from "./AgentModel";

@Entity()
export class AgentGroup {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @OneToMany(() => AgentModel, (agent) => agent.group)
  agents: AgentModel[];
}
