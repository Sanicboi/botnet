import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from "typeorm";
import { Lead } from "./Lead";
import { User } from "../User";

@Entity()
export class UserBot {
  @PrimaryColumn()
  token: string;

  // @Column({
  //   nullable: true,
  // })
  // lastSent: Date;

  @OneToMany(() => Lead, (lead) => lead.bot)
  leads: Lead[];

  @Column({ default: false })
  floodErr: boolean;

  // @ManyToOne(() => User, (user) => user.bots)
  // @JoinColumn({
  //   name: "userId",
  // })
  // user: User;

  // @Column({
  //   nullable: true,
  // })
  // userId: string;
}
