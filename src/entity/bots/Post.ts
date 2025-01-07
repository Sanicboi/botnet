
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Channel } from "./Channel";



@Entity()
export class Post {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    postId: string;

    @ManyToOne(() => Channel, (channel) => channel.posts)
    @JoinColumn({
        name: "channelId"
    })
    channel: Channel;

    @Column()
    channelId: string;

    @Column()
    topic: string;
    
    @Column()
    text: string;

    @CreateDateColumn()
    createdAt: Date;
}