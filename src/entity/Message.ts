import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";



@Entity()
export class Message {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        type: 'text'
    })
    text: string;

    @Column()
    botphone: string;

    @Column()
    username: string;

    @CreateDateColumn()
    date: Date;
}