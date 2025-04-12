import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "../User";
import { AgentModel } from "../AgentModel";


@Entity()
export class Dialog {


    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        default: ''
    })
    lastMsgId: string;

    @Column({
        default: ''
    })
    summarizedData: string;

    @CreateDateColumn()
    createdAt: Date;

    @ManyToOne(() => User, (user) => user.dialogs)
    user: User;
    
    @ManyToOne(() => AgentModel, (agent) => agent.dialogs)
    agent: AgentModel;

}