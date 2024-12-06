import { Column, Entity, OneToMany, PrimaryColumn } from "typeorm";
import { Dialog } from "./Dialog";

@Entity()
export class Bot {
  @PrimaryColumn()
  token: string;

  @Column({
    nullable: true,
  })
  phone: string;

  @Column({
    default: false,
  })
  blocked: boolean;

  @Column({
    nullable: true,
  })
  lastSentMessage: Date;

  @OneToMany(() => Dialog, (dialog) => dialog.bot)
  dialogs: Dialog[];
}
