import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "../User";

@Entity()
export class AudioFile {
  @PrimaryGeneratedColumn()
  id: string;

  @ManyToOne(() => User, (user) => user.audios)
  @JoinColumn({
    name: "userId",
  })
  user: User;

  @Column()
  userId: string;

  @Column()
  extension: string;

  @Column("text", {
    nullable: true,
  })
  caption: string | null;
}
