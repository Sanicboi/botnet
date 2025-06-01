export interface IFile {
    id(): string;
    asString(): string;
    asBuffer(): Buffer;
    extension(): string;
    basename(): string;
    size(): number;
    encoding(): BufferEncoding;
}