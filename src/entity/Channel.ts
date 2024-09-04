import { Column, Entity, OneToOne, PrimaryColumn } from "typeorm";
import { CommentChannel } from "./CommentChannel";


@Entity()
export class Channel {

    @PrimaryColumn()
    id: string;

    @OneToOne(() => CommentChannel, (channel) => channel.channel)
    commentChannel: CommentChannel;
}