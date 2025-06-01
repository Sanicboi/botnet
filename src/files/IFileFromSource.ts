import { IFile } from "./IFile";

export interface IFIleFromSource extends IFile {
    source(): string;
}
