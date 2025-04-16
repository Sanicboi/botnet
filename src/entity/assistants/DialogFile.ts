import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { Dialog } from "./Dialog";
import { User } from "../User";

@Entity()
export class DialogFile {
  @PrimaryColumn()
  id: string;

  @ManyToOne(() => Dialog, (dialog) => dialog.files)
  @JoinColumn({
    name: "dialogId",
  })
  dialog: Dialog;

  @ManyToOne(() => User, (user) => user.files)
  @JoinColumn({
    name: "userId",
  })
  user: User;
}
