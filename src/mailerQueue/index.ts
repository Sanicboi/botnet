/**
 * This is the worker that queues mailing list requests and processes them
 * Input: Mailer Bot
 * Output: OpenAI queue
 * Rate limits: TBA
 *
 * Functionality:
 * adds multiple openai requests to the queue
 *
 *
 */

import { Job, Queue, Worker } from "bullmq";
import { AppDataSource } from "../data-source";
import { Lead } from "../entity/bots/Lead";
import { Bot } from "../entity/bots/Bot";

interface IJob {
    type: 'singlemail' | 'mail';
}

interface ISingleJob extends IJob {
    type: 'singlemail';
    to: string;
}

type IJ = ISingleJob;

interface IMailerJob {
    type: "mailer";
    task: "create" | "reply";
    botId: string;
    toId: string;
    msg: string;
}

class MailerQueue {
    
    private manager = AppDataSource.manager;
    private worker: Worker;
    private openai = new Queue<IMailerJob>("openai", {
        connection: {
            host: 'redis'
        }
    });
    constructor() {
        AppDataSource.initialize();
        
        this.worker = new Worker("mailer", this.handle.bind(this), {
            connection: {
                host: 'redis'
            }
        });

    }

    private async handle(job: Job<IJ>) {
        
        
        if (job.data.type === 'singlemail') {
            console.log("MailerQueue")
            const lead = new Lead();
            lead.username = job.data.to;
            await this.manager.save(lead);

            const b = await this.manager.findOneBy(Bot, {
                blocked: false
            });
            console.log(b);
            if (!b) return;

            await this.openai.add('j', {
                botId: b.token,
                msg: '',
                task: 'create',
                toId: lead.username,
                type: 'mailer'
            });
        }
    }
}


const q = new MailerQueue();