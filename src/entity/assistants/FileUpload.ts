import { Entity, ManyToOne, PrimaryColumn } from "typeorm";
import { User } from "../User";

@Entity()
export class FileUpload {
  @PrimaryColumn()
  id: string;

  @ManyToOne(() => User, (user) => user.files)
  user: User;
}
