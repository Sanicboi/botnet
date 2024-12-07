import {
  loadPackageDefinition,
  Server,
  ServiceDefinition,
  ServerUnaryCall,
  sendUnaryData,
  ServerCredentials,
} from "@grpc/grpc-js";
import { loadSync } from "@grpc/proto-loader";
import path from "path";
import { IMsgSend, IMsgSendResult } from "./types";
import { EntityManager } from "typeorm";
import { AppDataSource } from "../data-source";
import { Api, TelegramClient } from "telegram";
import { Bot } from "../entity/bots/Bot";
import { StringSession } from "telegram/sessions";
import { NewMessage, NewMessageEvent } from "telegram/events";
import { Queue } from "bullmq";

/**
 * This is the main user account manager
 * Input: Mailer out queue
 * Output: In queue & DB
 * Rate limits: No rate limits
 *
 * Functionality:
 * Sends and processes messages. Collects telemetry and statistics
 */

class GRPCServer {
  private server: Server;
  private manager: EntityManager = AppDataSource.manager;
  private bots: Map<string, TelegramClient> = new Map();
  private queue: Queue = new Queue("in", {
    connection: {
      host: "redis",
    },
  });

  constructor() {
    const packageDef = loadSync(
      path.join(process.cwd(), "proto", "main.proto"),
      {
        keepCase: true,
      },
    );

    // @ts-ignore
    const descriptor: {
      manager: {
        AccountManager: {
          service: ServiceDefinition;
        };
      };
    } = loadPackageDefinition(packageDef);

    AppDataSource.initialize().then(async () => {
      this.server = new Server();
      this.server.addService(descriptor.manager.AccountManager.service, {
        SendMessage: this.SendMessage.bind(this),
      });

      const accounts = await this.manager.find(Bot, {
        where: {
          blocked: false,
        },
      });

      for (const b of accounts) {
        const session = new StringSession(b.token);
        const client = new TelegramClient(
          session,
          +process.env.TG_API_ID!,
          process.env.TG_API_HASH!,
          {
            useWSS: true,
          },
        );
        await client.start({
          onError: async (err) => {
            console.log(err);
            return true;
          },
          phoneNumber: "+799999999999999",
          phoneCode: async () => "",
        });
        this.bots.set(b.token, client);
        client.addEventHandler(async (e: NewMessageEvent) => {
          if (e.isPrivate) {
            const dialogs = await client.getDialogs();
            const dialog = dialogs.find(el => {
              return (
                el.entity?.className === 'User' &&
                String(el.entity?.id) === e.message.senderId!.toJSON()
              )
            })
            const u = dialog?.entity as Api.User;

            await this.queue.add("j", {
              from: u.username,
              to: client.session.save(),
              text: e.message.text,
            });
          }
        }, new NewMessage());
      }

      this.server.bindAsync(
        "0.0.0.0:50051",
        ServerCredentials.createInsecure(),
        () => {
          console.log("bound");
        },
      );
    });
  }

  public async SendMessage(
    call: ServerUnaryCall<IMsgSend, IMsgSendResult>,
    callback: sendUnaryData<IMsgSendResult>,
  ) {
    console.log(call.request);
    const data = call.request;
    const client = this.bots.get(data.fromId);
    console.log(client);
    if (!client) return;
    try {
      await client.sendMessage(data.toId, {
        message: data.messageText,
      });
      callback(null, {
        result: "Ok",
      });
    } catch (err) {
      console.error(err);
      callback(null, {
        result: "ServerErr",
      });
    }
  }
}

const s = new GRPCServer();
