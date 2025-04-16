import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Action } from "./Action";

@Entity()
export class Assistant {
  @PrimaryGeneratedColumn()
  id: string;

  @OneToMany(() => Action, (action) => action.assistant)
  actions: Action[];

  @Column()
  name: string;
}
