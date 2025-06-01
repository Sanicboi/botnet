import path from "path";
import { FileError } from "../errors/FileError";
import { ILocalFile } from "./ILocalFile";
import fs from 'fs/promises';

export abstract class LocalDirectoryFile implements ILocalFile {

    protected _name: string;
    protected _data?: Buffer;
    protected _encoding: BufferEncoding;
    protected _initialized: boolean = false;




    public constructor(name: string, encoding: BufferEncoding = "utf-8") {
        this._name = name;
        this._encoding = encoding;
    }

    public asBuffer(): Buffer {
        if (!this._data) throw new FileError("File not read!");
        return this._data;
    }

    public asString(): string {
        if (!this._data) throw new FileError("Data not set");
        return this._data.toString(this._encoding);
    }

    public basename(): string {
        return this._name;
    }

    public id(): string {
        return this._name;
    }



    public async delete(): Promise<void> {
        await fs.rm(this.path());
    }

    public encoding(): BufferEncoding {
        return this._encoding;
    }

    public async read(): Promise<void> {
        this._data = await fs.readFile(this.path());
        this._initialized = true;
    }

    public initialized(): boolean {
        return this._initialized;
    }

    public extension(): string {
        return path.extname(this._name);
    }

    public size(): number {
        if (!this._data) throw new FileError("File not read!");
        return Buffer.byteLength(this._data);
    }

    public async write(data: string | Buffer): Promise<void> {
        if (typeof data === 'string') this._data = Buffer.from(data);
        else this._data = data;
        await fs.writeFile(this.path(), this._data);
        this._initialized = true;
    }

    public abstract source(): string;
    public abstract path(): string;
}