import { Column, Entity, ManyToOne, PrimaryColumn } from "typeorm";
import { supportedAPIs } from "../neuro/apis/supportedModels";
import { Conversation } from "./Conversation";

@Entity()
export class FileUpload {
  @PrimaryColumn()
  id: string;

  @Column()
  storedIn: supportedAPIs;

  @Column()
  extension: string;

  @ManyToOne(() => Conversation, (conversation) => conversation.files)
  conversation: Conversation;
}
