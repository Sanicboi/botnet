import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";


@Entity()
export class ChatMsg {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    chatid: string;

    @Column()
    text: string;

    @Column({default: false})
    handled: boolean;
    
    @Column({default: false})
    from: string;

}