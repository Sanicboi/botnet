import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "../User";



@Entity() 
export class AudioFile {

    @PrimaryGeneratedColumn()
    id: string;

    @ManyToOne(() => User, (user) => user.audios) 
    @JoinColumn({
        name: "userId"
    })
    user: User;

    @Column()
    userId: string;

    @Column()
    large: boolean;

    @Column('real')
    duration: number;

    @Column()
    extension: string;

    @Column()
    size: number;

    @Column('real')
    cost: number;
    
}