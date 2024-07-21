import { Column, Entity, PrimaryColumn } from "typeorm";



@Entity()
export class Client {

    @PrimaryColumn()
    chatId: string;


    @Column({
        nullable: true
    })
    name: string;

    @Column({nullable: true})
    sphere: string;

    @Column({nullable: true})
    employees: string;

    @Column({nullable: true})
    cashflow: string;

    @Column({nullable: true})
    optimizing: 'sales' | 'mailer' | 'smm' | 'commenter' | 'hr' | 'other';

    @Column({nullable: true})
    task: string;

    @Column({nullable: true})
    peopleInSales: string;

    @Column({nullable: true})
    salesFormat: string;

    @Column({nullable: true})
    scriptHelp: boolean;

    @Column({nullable: true})
    salesStats: string;

    @Column({nullable: true})
    monthlyV: string;

    @Column({nullable: true})
    hasBases: boolean;

    @Column({nullable: true})
    hasSales: boolean;

    @Column({nullable: true})
    mailerCrm: string;

    @Column({nullable: true})
    averageCR: string;

    @Column({nullable: true})
    goal: string;

    @Column({nullable: true})
    channelLink: string;

    @Column({nullable: true})
    knowsCommenting: boolean;

    @Column({nullable: true})
    hasSmm: string;

    @Column({nullable: true})
    taskFull: string;

    @Column({nullable: true})
    hasHr: string;

    @Column({nullable: true})
    hrMetrics: string;

    @Column({nullable: true})
    callTime: string;

    @Column({nullable: true})
    finalGoal: string;
}