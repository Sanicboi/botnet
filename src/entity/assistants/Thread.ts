import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { User } from "../User";
import { Action } from "./Action";

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
}
