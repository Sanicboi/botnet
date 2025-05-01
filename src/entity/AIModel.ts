import { Column, Entity, OneToMany, PrimaryColumn } from "typeorm";
import { User } from "./User";
import { supportedAPIs } from "../neuro/apis/supportedModels";



@Entity()
export class AIModel {


    @PrimaryColumn()
    id: string;

    @Column('text', {
        default: ''
    })
    description: string;


    @OneToMany(() => User, (user) => user.model)
    users: User[];

    @Column()
    api: supportedAPIs;

    @Column('double precision')
    pricePerToken: number;
    
}