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

    @Column({default: ''})
    phone: string;

    @Column({default: ''})
    currentChatId: string;

    @Column({default: ''})
    currentThreadId: string;

    @Column({default: ''})
    from: string;

    @Column({default: false})
    progrevat: boolean;

    @Column({default: false})
    premium: boolean;

    @Column({default: 0})
    queueIdx: number;
}