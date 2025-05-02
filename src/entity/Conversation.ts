import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { FileUpload } from "./FileUpload";
import { User } from "./User";
import { supportedAPIs } from "../neuro/apis/supportedModels";

@Entity()
export class Conversation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    default: "",
  })
  apiId: string;

  @Column()
  api: supportedAPIs;

  @Column({
    default: true,
  })
  active: boolean;

  @Column({
    default: false
  })
  featured: boolean;

  @OneToMany(() => FileUpload, (file) => file.conversation)
  files: FileUpload[];

  @ManyToOne(() => User, (user) => user.conversations)
  user: User;
}
