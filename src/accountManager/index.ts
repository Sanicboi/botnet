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
import { TelegramClient } from "telegram";
import { Bot } from "../entity/bots/Bot";
import { StringSession } from "telegram/sessions";

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
  private static bots: Map<string, TelegramClient> = new Map();

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
        SendMessage: GRPCServer.SendMessage,
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
          {},
        );
        GRPCServer.bots.set(b.token, client);
      }

      this.server.bindAsync(
        "localhost:8080",
        ServerCredentials.createInsecure(),
        () => {
          this.server.start();
        },
      );
    });

    this.server = new Server();
    this.server.addService(descriptor.manager.AccountManager.service, {
      SendMessage: GRPCServer.SendMessage.bind(this),
    });
  }

  public static async SendMessage(
    call: ServerUnaryCall<IMsgSend, IMsgSendResult>,
    callback: sendUnaryData<IMsgSendResult>,
  ) {
    const data = call.request;
    const client = this.bots.get(data.fromId);
    console.log(client);
    callback(null, {
      result: "Ok",
    });
  }
}

const s = new GRPCServer();
