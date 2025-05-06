import OpenAI from "openai";
import { IAgentsAPI, IResult, IRun } from "./AgentsAPI";
import { FileUpload } from "../../entity/FileUpload";
import { AppDataSource } from "../../data-source";
import axios, { AxiosResponse } from "axios";
import path from "path";
import { Conversation } from "../../entity/Conversation";

const manager = AppDataSource.manager;

export class OpenAIApi implements IAgentsAPI {
  private openai: OpenAI = new OpenAI({
    apiKey: process.env.OPENAI_KEYs,
  });

  constructor() {}

  public async run(data: IRun): Promise<IResult> {
    const input = await this.getInput(data);

    const run = await this.openai.responses.create({
      input,
      model: data.model as OpenAI.AllModels,
      max_output_tokens: data.maxTokens,
      store: data.store,
      previous_response_id: data.conversation
        ? (data.conversation.apiId ?? undefined)
        : undefined,
    });

    return {
      content: run.output_text,
      conversationId: run.id,
      tokens: run.usage!.total_tokens,
    };
  }

  public async createSpeech(
    text: string,
    voice:
      | "alloy"
      | "ash"
      | "ballad"
      | "coral"
      | "echo"
      | "fable"
      | "onyx"
      | "nova"
      | "sage"
      | "shimmer"
      | "verse",
  ) {
    const res = await this.openai.audio.speech.create({
      input: text,
      model: "gpt-4o-mini-tts",
      voice,
    });
    return res.arrayBuffer();
  }

  public async getConversationTopic(
    conversation: Conversation,
  ): Promise<string> {
    const res = await this.openai.responses.create({
      input: "Дай тему предыдущего диалога",
      previous_response_id: conversation.apiId,
      model: "gpt-4o-mini",
      store: false,
    });
    return res.output_text;
  }

  private getDevMessage(data: IRun): OpenAI.Responses.ResponseInput {
    return (!data.conversation || !data.conversation.apiId) && data.instructions
      ? [
          {
            role: "developer",
            type: "message",
            content: data.instructions,
          },
        ]
      : [];
  }

  private async getInput(data: IRun): Promise<OpenAI.Responses.ResponseInput> {
    if (data.type === "text") return this.getTextInput(data);
    if (data.type === "image") return this.getImageInput(data);
    return await this.getDocumentInput(data);
  }

  private getTextInput(data: IRun): OpenAI.Responses.ResponseInput {
    const arr = this.getDevMessage(data);
    arr.push({
      role: "user",
      type: "message",
      content: data.input,
    });
    return arr;
  }

  private async getDocumentInput(
    run: IRun,
  ): Promise<OpenAI.Responses.ResponseInput> {
    if (!run.conversation) throw new Error("No conversation");
    const { data }: AxiosResponse<Buffer> = await axios.get(run.input);
    const upload = await this.openai.files.create({
      file: new File([data], path.basename(run.input)),
      purpose: "user_data",
    });
    const f = new FileUpload();
    f.id = upload.id;
    f.storedIn = "openai";
    f.conversation = run.conversation;
    f.extension = path.extname(run.input);
    await manager.save(f);
    run.conversation.files.push(f);

    const arr = this.getDevMessage(run);
    arr.push({
      type: "message",
      role: "user",
      content: run.caption
        ? [
            {
              type: "input_file",
              file_id: f.id,
            },
            {
              type: "input_text",
              text: run.caption,
            },
          ]
        : [
            {
              type: "input_file",
              file_id: f.id,
            },
          ],
    });
    return arr;
  }

  public async deleteFile(id: string) {
    await this.openai.files.del(id);
  }

  public async getConversation(id: string): Promise<
    {
      role: "user" | "assistant";
      content: string;
    }[]
  > {
    const res = await this.openai.responses.retrieve(id);
    const inputs = await this.openai.responses.inputItems.list(id);
    let result: {
      role: "user" | "assistant";
      content: string;
    }[] = [];

    for (const input of inputs.data) {
      if (input.type === "message") {
        if (input.role === "assistant") {
          result.push({
            role: "assistant",
            content: this.assistantContentToString(input.content),
          });
        } else if (input.role === "user") {
          result.push({
            role: "user",
            content: this.userContentToString(input.content),
          });
        }
      }
    }
    result.push({
      role: "assistant",
      content: res.output_text,
    });

    return result;
  }

  private assistantContentToString(
    content: (
      | OpenAI.Responses.ResponseOutputText
      | OpenAI.Responses.ResponseOutputRefusal
    )[],
  ): string {
    let result = "";
    for (const c of content) {
      if (c.type === "output_text") {
        result += c.text + "\n";
      }
    }
    return result;
  }

  private userContentToString(
    content: OpenAI.Responses.ResponseInputMessageContentList,
  ) {
    let result = "";
    for (const c of content) {
      if (c.type === "input_file") {
        result += "[Файл]\n";
      } else if (c.type === "input_image") {
        result += "[Картинка]\n";
      } else {
        result += c.text + "\n";
      }
    }
    return result;
  }

  private getImageInput(data: IRun): OpenAI.Responses.ResponseInput {
    const arr = this.getDevMessage(data);
    arr.push({
      type: "message",
      role: "user",
      content: data.caption
        ? [
            {
              type: "input_image",
              image_url: data.input,
              detail: "auto",
            },
            {
              type: "input_text",
              text: data.caption,
            },
          ]
        : [
            {
              type: "input_image",
              image_url: data.input,
              detail: "auto",
            },
          ],
    });
    return arr;
  }

  public async transcribeVoice(
    urlOrBuffer: string | Buffer,
    name: string,
  ): Promise<string> {
    let data: Buffer;
    if (typeof urlOrBuffer === "string") {
      const res: AxiosResponse<Buffer> = await axios.get(urlOrBuffer, {
        responseType: "arraybuffer",
      });
      data = res.data;
    } else {
      data = urlOrBuffer;
    }

    const r = await this.openai.audio.transcriptions.create({
      file: new File([data], name),
      model: "gpt-4o-mini-transcribe",
    });
    return r.text;
  }

  public async summarizeText(input: string): Promise<string> {
    const res = await this.openai.responses.create({
      input: input,
      instructions: "Суммаризируй данный тебе текст",
      store: false,
      model: "gpt-4o-mini",
    });
    return res.output_text;
  }

  public async generateImage(
    prompt: string,
    res: "1024x1024" | "1024x1792" | "1792x1024",
  ): Promise<string> {
    const result = await this.openai.images.generate({
      prompt,
      model: "dall-e-3",
      quality: "standard",
      size: res,
    });
    return result.data[0].url!;
  }
}
