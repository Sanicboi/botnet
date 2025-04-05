import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { User } from "../User";
import { Thread } from "./Thread";

@Entity()
export class FileUpload {
  @PrimaryColumn()
  id: string;

  @ManyToOne(() => User, (user) => user.files)
  @JoinColumn({
    name: "userId",
  })
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => Thread, (thread) => thread.files, {
    onDelete: "CASCADE",
  })
  @JoinColumn({
    name: "threadId",
  })
  thread: Thread;

  @Column()
  threadId: string;
}
