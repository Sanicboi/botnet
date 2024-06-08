import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Bot {
    @PrimaryGeneratedColumn('uuid')
    id: string;


    @Column({nullable: true})
    token: string;
}