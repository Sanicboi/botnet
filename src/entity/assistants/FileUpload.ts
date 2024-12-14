import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { User } from "../User";

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
}
