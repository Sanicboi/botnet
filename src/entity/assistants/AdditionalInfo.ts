import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "../User";
import { Assistant } from "./Assistant";

@Entity()
export class AdditionalInfo {
  @PrimaryGeneratedColumn()
  id: string;

  @ManyToOne(() => User, (user) => user.data)
  @JoinColumn({
    name: "userId",
  })
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => Assistant, (assistant) => assistant.data)
  @JoinColumn({
    name: "assistantId",
  })
  assistant: Assistant;

  @Column()
  assistantId: string;

  @Column({
    default: "",
  })
  text: string;
}
