import { Column, Entity, PrimaryColumn } from "typeorm";


@Entity()
export class User {
    @PrimaryColumn()
    usernameOrPhone: string;

    @Column({nullable: true})
    botid: string;

    @Column({default: false})
    replied: boolean;

    @Column({nullable: true})
    threadId: string;

    @Column({default: false})
    finished: boolean;

    
}