import {
  ChannelCredentials,
  Client,
  ClientUnaryCall,
  ServiceError,
} from "@grpc/grpc-js";

export interface IMsgSend {
  fromId: string;
  toId: string;
  messageText: string;
}

export type ResType = "Ok" | "ClientErr" | "ServerErr";

export interface IMsgSendResult {
  result: ResType;
}

export interface IService {
  sendMessage(
    input: IMsgSend,
    callback: (err: ServiceError | null, response: IMsgSendResult) => void,
  ): ClientUnaryCall;
}

export interface IPackage {
  AccountManager: IService;
}

export interface ServiceClient extends Client {
  sendMessage(
    input: IMsgSend,
    callback: (err: ServiceError | null, response: IMsgSendResult) => void,
  ): ClientUnaryCall;
}
