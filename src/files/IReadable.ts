import { IInitializable } from "./IInitializable";

export interface IReadable extends IInitializable {
    read(): Promise<void>;
}