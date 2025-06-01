import { IStorageFile } from "./storage/Storage";


export interface IApiStrategy {
  generateText(): Promise<unknown>;
  getConversation(): Promise<unknown>;
  uploadFile(url: string): Promise<IStorageFile>;
  deleteFile(file: IStorageFile): Promise<void>;
}
