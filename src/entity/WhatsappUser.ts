import { Column, Entity, PrimaryGeneratedColumn, Tree } from "typeorm";


@Entity()
export class WhatsappUser {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    phone: string;

    @Column({default: false})
    replied: boolean;

    @Column({nullable: true})
    threadId: string;

    @Column({default: false})
    finished: boolean;
}