import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { User } from "../User";
import { PromoCode } from "./Promo";


@Entity()
export class UserPromo {


    @ManyToOne(() => User, (user) => user.promos)
    @JoinColumn({
        name: "userId"
    })
    user: User;

    @Column()
    userId: string;

    @ManyToOne(() => PromoCode, (code) => code.userPromos)
    @JoinColumn({
        name: "promoId"
    })
    promo: PromoCode;

    @Column()
    promoId: string;
}