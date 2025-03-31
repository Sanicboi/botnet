import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";


@Entity()
export class AgentModel {
    
    @PrimaryGeneratedColumn()
    id: number;

    @Column() 
    name: string;
    
    @Column("text")
    prompt: string;

    @Column("text")
    firstMessage: string;

    @Column()
    responseFormat: "text" | "html" | "voice" | "json";

    @Column("float")
    temperature: number;

    @Column("float")
    topP: number;
}