import path from "path";
import { FileError } from "../errors/FileError";
import { IRemoteFile } from "./IRemoteFile";
import { Bot } from "../Bot";
import axios, { AxiosResponse } from "axios";
import { IReadable } from "./IReadable";


export class TelegramFile implements IRemoteFile, IReadable {
    private _file?: Buffer;
    private _url?: string;
    private readonly _id: string;
    private _initialized: boolean = false;
    private _encoding: BufferEncoding;

    public constructor(id: string, encoding: BufferEncoding = "utf-8") {
        this._id = id;
        this._encoding = encoding;
    }

    public encoding(): BufferEncoding {
        return this._encoding;
    }

    public initialized(): boolean {
        return this._initialized;
    }

    public async read(): Promise<void> {
        this._url = await Bot.s_Instance.getUrl(this._id);
        const res: AxiosResponse<Buffer> = await axios.get(this._url, {
            responseType: 'arraybuffer',
        });
        this._file = res.data;
        this._initialized = true;
    }

    public asBuffer(): Buffer {
        if (!this._file) throw new FileError("File not read!");
        return this._file;
    }

    public asString(): string {
        if (!this._file) throw new FileError("File not read!");
        return this._file.toString(this._encoding)
    }

    public basename(): string {
        if (!this._url) throw new FileError("File not read!");
        return path.basename(this._url);
    }

    public extension(): string {
        if (!this._url) throw new FileError("File not read!");
        return path.extname(this._url);
    }

    public url(): string {
        if (!this._url) throw new FileError("File not read!");
        return this._url;
    }

    public id(): string {
        return this._id;
    }

    public source(): "telegram" {
        return "telegram";
    }

    public size(): number {
        if (!this._file) throw new FileError("File not read!");
        return this._file.length;
    }




}