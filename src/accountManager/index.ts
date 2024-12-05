import { loadPackageDefinition, Server, ServiceDefinition, ServerUnaryCall, sendUnaryData, ServerCredentials} from '@grpc/grpc-js';
import {loadSync} from '@grpc/proto-loader';
import path from 'path';
import { IMsgSend, IMsgSendResult, IService } from './types';
import { EntityManager } from 'typeorm';
import { AppDataSource } from '../data-source';
import  { TelegramClient } from 'telegram';
import { Bot } from '../entity/bots/Bot';
import { StringSession } from 'telegram/sessions';



class Implementation {

    private server: Server;
    private manager: EntityManager = AppDataSource.manager;
    private static bots: Map<string, TelegramClient> = new Map();

    constructor() {
        const packageDef = loadSync(path.join(process.cwd(), 'proto', 'main.proto'), {
            keepCase: true,
        });
        
        // @ts-ignore
        const descriptor: {
            manager: {
                AccountManager: {
                    service: ServiceDefinition
                }
            }
        } = loadPackageDefinition(packageDef);
        
        AppDataSource.initialize().then(async () => {
            this.server = new Server();
            this.server.addService(descriptor.manager.AccountManager.service, {
                SendMessage: Implementation.SendMessage
            });

            const accounts = await this.manager.find(Bot, {
                where: {
                    blocked: false
                }
            });

            for (const b of accounts) {
                const session = new StringSession(b.token);
                const client = new TelegramClient(session, +process.env.TG_API_ID!, process.env.TG_API_HASH!, {

                });
                Implementation.bots.set(b.token, client);
            }

            this.server.bindAsync('localhost:8080', ServerCredentials.createInsecure(), () => {
                this.server.start();
            })
        });

        this.server = new Server();
        this.server.addService(descriptor.manager.AccountManager.service, {
            SendMessage: Implementation.SendMessage
        });
    }

    public static async SendMessage(call: ServerUnaryCall<IMsgSend, IMsgSendResult>, callback: sendUnaryData<IMsgSendResult>) {
        const data = call.request;
        const client = this.bots.get(data.fromId);
        console.log(client);
        callback(null, {
            result: 'Ok'
        });
    }
    
}


const s = new Implementation();




