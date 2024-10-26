import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  OneToOne,
  PrimaryColumn,
} from "typeorm";
import { Bot } from "./Bot";
import { CascadeUser } from "./CascadeUser";
import { SpamUser } from "./SpamUser";

@Entity()
export class User {
  @PrimaryColumn()
  usernameOrPhone: string;

  @Column({
    default: false,
  })
  sent: boolean;

  @OneToOne(() => CascadeUser, (cascade) => cascade.user, {
    cascade: true,
  })
  cascade: CascadeUser;

  @OneToOne(() => SpamUser, (spam) => spam.user, {
    cascade: true,
  })
  spam: SpamUser;
}
