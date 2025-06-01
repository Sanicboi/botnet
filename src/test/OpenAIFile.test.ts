import { test, describe, expect } from "vitest";
import 'dotenv/config';
import { OpenAIFIle } from "../files/OpenAIFile";
import { OpenAIAPI } from "../apis/openai";


describe("OpenAI File class", () => {
    
    test("Can create and delete a simple file", async () => {
        const data = 'Example data';
        const name = 'example.txt';
        const encoding = 'utf-8';
        const size = Buffer.byteLength(data);

        const file = new OpenAIFIle(undefined, name, 'assistants', encoding);
        expect(file.basename()).toBe(name);
        expect(file.purpose()).toBe('assistants');
        expect(file.encoding()).toBe(encoding);
        expect(file.source()).toBe('openai');


        await file.write(data);
        expect(file.asString()).toBe(data);
        expect(file.asBuffer().toString(encoding)).toBe(data);
        expect(file.size()).toBe(size);
        

        const inOpenAI = await OpenAIAPI.s_Instance.getFileInfo(file.id());
        expect(inOpenAI.purpose).toBe(file.purpose());
        expect(inOpenAI.filename).toBe(file.basename());
        expect(inOpenAI.id).toBe(file.id());
        
        await file.delete();

        await expect(async () => await OpenAIAPI.s_Instance.getFileInfo(file.id())).rejects.toThrow();    
        
    })
})