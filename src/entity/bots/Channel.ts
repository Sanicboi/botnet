import { Entity, OneToMany, PrimaryColumn } from "typeorm";
import { Post } from "./Post";

@Entity()
export class Channel {
  @PrimaryColumn()
  username: string;

  @OneToMany(() => Post, (post) => post.channel)
  posts: Post[];
}
