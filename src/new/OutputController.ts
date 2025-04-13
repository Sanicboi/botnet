import { openai } from "../neuro";
//@ts-ignore
import docx from "html-to-docx";
import { OutputFormat } from "../utils/OutputFormat";
import { Bot } from "./Bot";
import { User } from "../entity/User";




/**
 * This is the general interface for File Data. 
 * TODO: move it somewhere else
 */
export interface IFileData {
    content: Buffer;
    name: string;
    type: string;
}

/**
 * General interface for output
 */
interface IOutput<T> {
    data: T;
    type: OutputFormat;
}


/**
 * Text output
 */
interface ITextOutput extends IOutput<string> {
    type: "text";
}

/**
 * File Output (To be sent as a document)
 */
interface IFileOutput extends IOutput<IFileData> {
    type: "docx" | "html";
}

/**
 * Audio output (To be sent as a voice message or as an audio)
 */
interface IAudioOutput extends IOutput<IFileData> {
    type: "audio";
}

/**
 * General type
 */
type Output = ITextOutput | IAudioOutput | IFileOutput;

/**
 * This class is responsible for converting the model´s response in plain text to another format - html, audio, docx or any other
 * It is also responsible with sending the result
 */
export class OutputController {


    /**
     * Empty constructor
     */
    constructor(private bot: Bot) { }

    /**
     * Utility method to convert text to HTML Using ChatGPT
     * @param data text to convert 
     * @returns Formatted output HTML
     */
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


    /**
     * Utility method to read an audio using the OpenAI TTS API
     * @param text text to read
     * @returns MP3 Audio Buffer
     */
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


    /**
     * Convert, if necessary, the output of the model to a given format
     * @param response The model output
     * @param format The format to convert to
     * @returns Output object
     */
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

    public async send(output: Output, user: User) {
        if (output.type === "text") {
            await this.bot.bot.sendMessage(+user.chatId, output.data);
        } else {
            await this.bot.bot.sendDocument(+user.chatId, output.data.content, {}, {
                contentType: output.data.type,
                filename: output.data.name
            })
        }
    }
}