import OpenAI from "openai"
import { EnvError } from "../errors/EnvError";
import { OpenAIError } from "../errors/OpenAIError";


export type FileInfo = {
    filename: string;
    id: string;
    purpose: "assistants" | "vision";
}

export type FileData = {
    buffer: Buffer;
    url: string;
}

export class OpenAIAPI {


    private _openai: OpenAI;
    private static _instance?: OpenAIAPI;


    private constructor() {
        if (!process.env.OPENAI_KEY) throw new EnvError("OPENAI_KEY");
        this._openai = new OpenAI({
            apiKey: process.env.OPENAI_KEY
        })
    }

    public static get s_Instance(): OpenAIAPI {
        if (!this._instance) {
            this._instance = new OpenAIAPI();
        }

        return this._instance;
    }

    public async getFileInfo(id: string): Promise<FileInfo> {
        const res = await this._openai.files.retrieve(id);
        if (res.purpose !== 'vision' && res.purpose !== 'assistants') throw new OpenAIError("Wrong file purpose!");
        return {
            filename: res.filename,
            id: res.id,
            purpose: res.purpose
        };
    }

    public async getFileData(id: string): Promise<FileData> {
        const res = await this._openai.files.content(id);
        return {
            buffer: Buffer.from(await res.arrayBuffer()),
            url: res.url
        }
    }

    public async deleteFile(id: string): Promise<void> {
        await this._openai.files.del(id);
    }

    public async createFile(data: Buffer, name: string, purpose: OpenAI.Files.FilePurpose): Promise<string> {
        const res = await this._openai.files.create({
            file: new File([data], name),
            purpose
        });
        return res.id;
    }

}