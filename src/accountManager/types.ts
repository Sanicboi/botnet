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
  sendMessage(input: IMsgSend): IMsgSendResult;
}

export interface IPackage {
  AccountManager: IService;
}
