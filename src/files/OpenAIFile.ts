import path from "path";
import { OpenAIAPI } from "../apis/openai";
import { FileError } from "../errors/FileError";
import { IRemoteFile } from "./IRemoteFile";
import OpenAI from "openai";
import { IWritable } from "./IWritable";
import { IDeletable } from "./IDeletable";



export class OpenAIFIle implements IRemoteFile, IWritable, IDeletable {

    private _id?: string;
    private _encoding: BufferEncoding;
    private _initialized: boolean = false;
    private _file?: Buffer;
    private _url?: string;
    private _name?: string;
    private _purpose?: "vision" | "assistants";


    public initialized(): boolean {
        return this._initialized;
    }

    public asBuffer(): Buffer {
        if (!this._file) throw new FileError("File not read!");
        return this._file;
    }

    public asString(): string {
        if (!this._file) throw new FileError("File not read!");
        return this._file.toString(this._encoding);
    }

    public basename(): string {
        if (!this._name) throw new FileError("File not read!");
        return this._name;
    }

    public encoding(): BufferEncoding {
        return this._encoding;
    }

    public extension(): string {
        if (!this._name) throw new FileError("File not read!");
        return path.extname(this._name);
    }

    public id(): string {
        if (!this._id) throw new FileError("File ID Not set!");
        return this._id;
    }

    public size(): number {
        if (!this._file) throw new FileError("File not read!");
        return this._file.length;
    }

    public url(): string {
        if (!this._url) throw new FileError("File not read!");
        return this._url;
    }

    public source(): "openai" {
        return "openai";
    }

    public purpose(): 'vision' | 'assistants' {
        if (!this._purpose) throw new FileError("Purpose not set!");
        return this._purpose;
    }
 
    public async delete(): Promise<void> {
        if (!this._id) throw new FileError("File ID Not set!");
        await OpenAIAPI.s_Instance.deleteFile(this._id);
    }


    public constructor(id?: string, name?: string, purpose?: 'vision' | 'assistants', encoding: BufferEncoding = "utf-8") {
        this._encoding = encoding;
        this._id = id;
        this._name = name;
        this._purpose = purpose;
    }

    public async write(data: string | Buffer): Promise<void> {

        if (typeof data === 'string') this._file = Buffer.from(data, this._encoding);
        else this._file = data;
        if (!this._id) {
            if (!this._name) throw new FileError("Filename not set!");
            if (!this._purpose) throw new FileError("Purpose not set!");
            this._id = await OpenAIAPI.s_Instance.createFile(this._file, this._name, this._purpose);
        } else {
            await OpenAIAPI.s_Instance.deleteFile(this._id);
            if (!this._name) throw new FileError("Filename not set!");
            if (!this._purpose) throw new FileError("Purpose not set!");
            this._id = await OpenAIAPI.s_Instance.createFile(this._file, this._name, this._purpose);
        }
        this._initialized = true;
    }

}