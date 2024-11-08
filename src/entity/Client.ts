import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity()
export class Client {
  @PrimaryColumn()
  chatId: string;

  @Column({ nullable: true })
  sphere: string;

  @Column({ nullable: true })
  leads: string;

  @Column({ nullable: true })
  callDate: string;

  @Column({ nullable: true })
  optimize: string;

  @Column({ default: "n" })
  qt: "n" | "s" | "l" | "d" | "a" | "o";
}
