import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from "typeorm";
import { Assistant } from "./Assistant";
import { Thread } from "./Thread";

@Entity()
export class Action {
  @PrimaryColumn()
  id: string;

  @ManyToOne(() => Assistant, (assistant) => assistant.actions)
  @JoinColumn({
    name: "assistantId",
  })
  assistant: Assistant;

  @Column({
    nullable: true,
  })
  assistantId: string;

  @OneToMany(() => Thread, (thread) => thread.action)
  threads: Thread[];

  @Column()
  name: string;

  @Column({ default: "Стартовое сообщение" })
  welcomeMessage: string;

  @Column({ default: "html-file" })
  format: "text" | "html-file";

  @Column('string',{
    nullable: true,
  })
  exampleFile: string | null;
}
