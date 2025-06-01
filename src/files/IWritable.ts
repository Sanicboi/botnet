import { IInitializable } from "./IInitializable";

export interface IWritable extends IInitializable {
    write(data: string | Buffer): Promise<void>;
}