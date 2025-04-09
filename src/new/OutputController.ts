import { openai } from "../neuro";
//@ts-ignore
import docx from "html-to-docx";


export type OutputFormat = "text" | "html" | "docx" | "audio";

interface IFileData {
    content: Buffer;
    name: string;
    type: string;
}

interface IOutput<T> {
    data: T;
    type: OutputFormat;
}

interface ITextOutput extends IOutput<string> {
    type: "text";
}

interface IFileOutput extends IOutput<IFileData> {
    type: "docx" | "html";
}

interface IAudioOutput extends IOutput<IFileData> {
    type: "audio";
}

type Output = ITextOutput | IAudioOutput | IFileOutput;

/**
 * This class is responsible for converting the model´s response in plain text to another format - html, audio, docx or any other
 */
export class OutputController {



    constructor() { }

    private async convertToHtml(data: string): Promise<string> {
        const res = await openai.responses.create({
            model: "gpt-4o-mini",
            input: [
                {
                    role: "developer",
                    content: "Ты - профессиональный верстальщик. Конвертируй данный тебе отчет в HTML (UTF-8). При этом сохрани, не изменив, весь текст из отчета. Результат должен быть красивым. В ответе пришли ТОЛЬКО HTML."
                },
                {
                    role: "user",
                    content: data
                }
            ],
            store: false
        });

        return res.output_text.replaceAll("```html", "").replaceAll("`", "");
    }

    private async createAudio(text: string): Promise<Buffer> {
        const mp3 = await openai.audio.speech.create({
            input: text,
            model: "gpt-4o-mini-tts",
            voice: "alloy",
            instructions: "Adapt your tone based on the input"
        });
        const res = await mp3.arrayBuffer();
        return Buffer.from(res);
    }

    public async convert(response: string, format: OutputFormat): Promise<Output> {
        if (format === "text") return {
            type: "text",
            data: response
        };

        if (format === "html" || format === "docx") {
            const converted = await this.convertToHtml(response);
            if (format === "html") return {
                data: {
                    content: Buffer.from(converted, "utf-8"),
                    name: "report.html",
                    type: "text/html"
                },
                type: "html"
            }

            const doc: Buffer = await docx(
                converted,
                null,
                {
                    table: {
                        row: {
                            cantSplit: true,
                        },
                    },
                },
            );

            return {
                data: {
                    content: doc,
                    name: "report.docx",
                    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                },
                type: "docx"
            }
        }

        const buf = await this.createAudio(response);
        return {
            data: {
                content: buf,
                name: "report.mp3",
                type: "audio/mpeg"
            },
            type: "audio"
        }
    }
}