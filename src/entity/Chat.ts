import { Entity, Column, OneToMany, PrimaryColumn } from 'typeorm'
import { Bot } from './Bot'
import { Thread } from './Thread';
@Entity()
export class Chat {
  @PrimaryColumn()
  id: string;

  @OneToMany(() => Thread, (thread) => thread.chat)
  threads: Chat[];

  @Column({default: false})
  listen: boolean;

}
