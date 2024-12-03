import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class SupportRequest {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  userId: string;

  @Column({
    default: false,
  })
  handled: boolean;

  @Column()
  type: "question" | "advice" | "feedback";

  @Column({ default: "" })
  text: string;

  @Column({
    default: true,
  })
  isInProgress: boolean;
}
