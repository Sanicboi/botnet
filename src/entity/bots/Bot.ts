import { Column, Entity, PrimaryColumn } from "typeorm";

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
}
