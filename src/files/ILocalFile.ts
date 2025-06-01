import { IDeletable } from "./IDeletable";
import { IFIleFromSource } from "./IFileFromSource";
import { IReadable } from "./IReadable";
import { IWritable } from "./IWritable";

export interface ILocalFile extends IFIleFromSource, IReadable, IWritable, IDeletable {
    path(): string;
}