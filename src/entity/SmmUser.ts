import {Column, Entity, PrimaryColumn} from 'typeorm';


@Entity() 
export class SmmUser {
    
    @PrimaryColumn()
    id: string;

    @Column()
    threadId: string;
}