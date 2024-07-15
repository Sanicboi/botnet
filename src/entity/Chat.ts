import { Entity, Column, OneToMany } from 'typeorm'
import { Bot } from './Bot'
@Entity()
export class Chat {
  @PrimaryColumn()
  id: string;


}
