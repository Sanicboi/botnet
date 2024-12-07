import { Entity, JoinColumn, OneToMany, PrimaryColumn } from "typeorm";
import { Dialog } from "./Dialog";

@Entity()
export class Lead {
  @PrimaryColumn()
  username: string;

  @OneToMany(() => Dialog, (dialog) => dialog.lead)
  dialogs: Dialog[];
}
