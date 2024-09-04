import { Entity, Column, OneToMany, PrimaryColumn } from 'typeorm'
import { Bot } from './Bot';
@Entity()
export class Chat {
  @PrimaryColumn()
  id: string;

}
