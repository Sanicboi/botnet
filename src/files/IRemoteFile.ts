import { IFIleFromSource } from "./IFileFromSource";


export interface IRemoteFile extends IFIleFromSource {
    url(): string;
}