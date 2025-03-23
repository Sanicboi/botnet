import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Action } from "./Action";
import { AdditionalInfo } from "./AdditionalInfo";

@Entity()
export class Assistant {
  @PrimaryGeneratedColumn()
  id: string;

  @OneToMany(() => Action, (action) => action.assistant)
  actions: Action[];

  @Column()
  name: string;

  @OneToMany(() => AdditionalInfo, (info) => info.assistant)
  data: AdditionalInfo[];

  @Column({
    default: ''
  })
  dataToFill: string;
}
