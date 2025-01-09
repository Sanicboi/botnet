import { Column, Entity, OneToMany, PrimaryColumn } from "typeorm";
import { UserPromo } from "./UserPromo";

@Entity()
export class PromoCode {
  @PrimaryColumn()
  name: string;

  @Column()
  expiresAt: Date;

  @Column()
  limit: number;

  @Column("real") // IN RUBLES
  amount: number;

  @OneToMany(() => UserPromo, (userPromo) => userPromo.promo)
  userPromos: UserPromo[];
}
