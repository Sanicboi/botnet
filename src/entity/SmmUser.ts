import {Column, Entity, PrimaryColumn} from 'typeorm';


@Entity() 
export class SmmUser {
    
    @PrimaryColumn()
    id: string;

    @Column()
    threadId: string;

    @Column({nullable: true})
    category: string;

    @Column({nullable: true})
    style: string;

}