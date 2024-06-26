import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Bot {
    @PrimaryGeneratedColumn('uuid')
    id: string;


    @Column({nullable: true})
    token: string;

    @Column({default: false})
    blocked: boolean;

    @Column({default: true})
    send: boolean;

    @Column({default: 'male'})
    gender: 'male' | 'female';
}