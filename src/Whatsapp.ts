import axios from 'axios';
import { Queue, Worker } from 'bullmq';
import express from 'express';
import TelegramBot from 'node-telegram-bot-api';
import OpenAI from 'openai';
import { DataSource } from 'typeorm';
import { WhatsappUser } from './entity/WhatsappUser';
import { Determiner } from './determiner';


const wait = async (s) => await new Promise((resolve, reject) => setTimeout(resolve, s * 1000));
interface webhookBody {
    messageId: string,
    channelId: string,
    chatType: 'whatsapp' | 'whatsgroup' | 'instagram' | 'telegram' | 'telegroup' | 'vk' | 'avito',
    chatId: string,
    type: string, // need text
    status: 'sent' | 'delivered' | 'read' | 'inbound' | 'error',
    text?: string,
    test?: boolean
}

export class Whatsapp {
    public server: express.Application;
    public queue: Queue;
    public worker: Worker;
    constructor (openai: OpenAI, src: DataSource, manager: TelegramBot, determiner: Determiner) {
        this.connect = this.connect.bind(this);
        this.listTemplates = this.listTemplates.bind(this);
        this.listen = this.listen.bind(this);
        this.sendTemplates = this.sendTemplates.bind(this);
        this.sendMessage = this.sendMessage.bind(this);
        this.schedule = this.schedule.bind(this);
        const userRepo = src.getRepository(WhatsappUser);
        this.server = express();
        this.server.use(express.json());
        this.server.post('/api/message', async (req: express.Request<any, any, {messages: webhookBody[]}>, res) => {
            try {
                //@ts-ignore
                if (req.body.test === true) {
                    return res.status(200).end();
                }
                for (const m of req.body.messages) {
                    if (m.chatType === 'whatsapp' && m.type == 'text' && m.text) {
                        const user = await userRepo.findOneBy({ 
                            phone: m.chatId
                        });
                        console.log(user);
                        if (user) {
                            await wait(10)
                            await determiner.answerWhatsApp(m.text, user, userRepo, this);
                        }
                    }
                }
            } catch (err) {
                console.log(err);
            }
            return res.status(200).end();
        });

        this.worker = new Worker('wapp', async (job) => {
            console.log(job.data);
            const thread = await openai.beta.threads.create({
                messages: [
                    {
                        content: 'Приветствую, я являюсь сооснователем бизнес клуба Legat Business. Хочу с Вами познакомиться и понять по каким вопросам к Вам можно обращаться? Мы ищем интересные проекты в которые можно инвестировать, предпринимателей и экспертов для партнерства. Готовы направить к Вам нашу аудиторию в качестве клиентов. Видел Вас в нескольких чатах сообществ в телеграмм группах. Если требуется могу прислать информацию о нас.', // TODO
                        role: 'assistant'
                    }
                ]
            });
            const user = await userRepo.findOneBy({
                phone: job.data.to,
            });
            console.log(user);
            user.threadId = thread.id;
            await userRepo.save(user);
            console.log(user);
            const res = await this.sendTemplates(job.data.to);
            console.log(res);
            await manager.sendMessage(-1002201795929, `Отправлено сообщение WhatsApp. К: ${job.data.to}`);
        }, {
            connection: {
                host: 'redis'
            },
            limiter: {
                duration: 2 * 60000,
                max: 1
            }
        });
        this.queue = new Queue('wapp', {
            connection: {
                host: 'redis'
            }
        })
    }

    public async connect() {
        return await axios.patch('https://api.wazzup24.com/v3/webhooks', {
            webhooksUri: process.env.BASE_URL + '/api/message',
            subscriptions: {
                messagesAndStatuses: true,
                contactsAndDealsCreation: false,
                channelsUpdates: false,
                templateStatus: false
            }
        }, {
            headers: {
                Authorization: `Bearer ${process.env.WAZZUP_KEY}`
            }
        })
    }

    public async listTemplates() {
        const res = await axios.get('https://api.wazzup24.com/v3/templates/whatsapp', {
            headers: {
                Authorization: `Bearer ${process.env.WAZZUP_KEY}`
            }
        });
        return res.data;
    }

    public listen() {
        this.server.listen(8082);
    }

    public async sendMessage(to: string, text: string) {
        const res = await axios.post('https://api.wazzup24.com/v3/message', {
            channelId: '9337fe33-5797-405c-8e77-7f88402bc506', //TODO
            chatType: 'whatsapp',
            chatId: to,
            text,
        }, {
            headers: {
                Authorization: `Bearer ${process.env.WAZZUP_KEY}`
            }
        });
    }

    public async sendTemplates(to: string) {
        const res = await axios.post('https://api.wazzup24.com/v3/message', {
            channelId: '9337fe33-5797-405c-8e77-7f88402bc506', //TODO
            chatType: 'whatsapp',
            chatId: to,
            templateId: 'ab5d4606-237c-48db-8ff3-70ace4eef683', //TODO
            templateValues: [] // TODO
        }, {
            headers: {
                Authorization: `Bearer ${process.env.WAZZUP_KEY}`
            }
        });
        return res;
    }

    public async schedule(to: string) {
        await this.queue.add('send', {
            to
        });
    }
}

