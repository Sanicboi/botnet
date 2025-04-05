import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from "typeorm";
import { User } from "../User";
import { Action } from "./Action";
import { FileUpload } from "./FileUpload";

@Entity()
export class Thread {
  @PrimaryColumn()
  id: string;

  @ManyToOne(() => User, (user) => user.threads)
  @JoinColumn({
    name: "userId",
  })
  user: User;

  @ManyToOne(() => Action, (act) => act.threads)
  @JoinColumn({
    name: "actionId",
  })
  action: Action;

  @Column({
    nullable: true,
  })
  userId: string;

  @Column({
    nullable: true,
  })
  actionId: string;

  @Column({ default: "" })
  firstMsg: string;

  @OneToMany(() => FileUpload, (file) => file.thread)
  files: FileUpload[];
}
