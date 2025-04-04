/**
 *
 * AI Agents class
 * - This class represents an abstraction of an AI agent. It is not constructed, it is "Built" on top of an AgentModel - the record in the database.
 *
 *
 *
 *
 *
 *
 *
 */

import { ResponsesModel } from "openai/resources/shared";
import { AppDataSource } from "../data-source";
import { AgentModel } from "../entity/AgentModel";
import { openai } from "../neuro";
import OAI from "openai/resources";
import axios, { AxiosResponse } from "axios";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import { Readable, Writable } from "typeorm/platform/PlatformTools";
import { buffer } from "stream/consumers";

const manager = AppDataSource.manager;
interface IInputData {
  type: "text" | "audio" | "document" | "image";
  value: string;
  caption?: string;
  previousResponseId?: string;
}

export class Agent {
  private _initialized: boolean = false;

  public get initialized(): boolean {
    return this._initialized;
  }

  private _id: number;

  public get id(): number {
    return this._id;
  }

  private _model: AgentModel;

  public get model(): AgentModel {
    return this._model;
  }

  constructor(id: number);
  constructor(model: AgentModel);
  constructor(idOrModel: number | AgentModel) {
    if (typeof idOrModel === "number") {
      this._id = idOrModel;
    } else {
      this._id = idOrModel.id;
      this._initialized = true;
      this._model = idOrModel;
    }
  }

  public async initialize(): Promise<void> {
    if (!this.initialized) {
      const res = await manager.findOne(AgentModel, {
        where: {
          id: this._id,
        },
      });

      if (!res) throw new Error("Agent model not found");

      this._model = res;
    }
  }

  public async run(
    input: IInputData,
    model: ResponsesModel = "gpt-4o",
  ): Promise<OAI.Responses.Response> {
    let inp: OAI.Responses.ResponseInput = [
      {
        role: "developer",
        content: this.model.prompt,
      },
    ];

    if (input.type === "text") {
      inp.push({
        role: "user",
        content: input.value,
      });
    } else if (input.type === "image") {
      let content: OAI.Responses.ResponseInputMessageContentList = [
        {
          type: "input_image",
          detail: "auto",
          image_url: input.value,
        },
      ];
      if (input.caption) {
        content.push({
          type: "input_text",
          text: input.caption,
        });
      }
      inp.push({
        type: "message",
        role: "user",
        content,
      });
    } else if (input.type === "document") {
      const res: AxiosResponse<Buffer> = await axios.get(input.value, {
        responseType: "arraybuffer",
      });
      const asFile = new File([res.data], path.basename(input.value));
      const file = await openai.files.create({
        file: asFile,
        purpose: "user_data",
      });

      let content: OAI.Responses.ResponseInputMessageContentList = [
        {
          type: "input_file",
          file_id: file.id,
        },
      ];

      if (input.caption) {
        content.push({
          type: "input_text",
          text: input.caption,
        });
      }

      inp.push({
        type: "message",
        role: "user",
        content,
      });
    } else if (input.type === "audio") {
      const { data }: AxiosResponse<Buffer> = await axios.get(input.value, {
        responseType: "arraybuffer",
      });
      let result = "";
      if (data.length > 25 * 1024 * 1024) {
        const str = new Readable();
        str.push(data);
        str.push(null);
        await new Promise<void>((resolve, reject) => {
          let i = 0;
          const outputStream = new Writable({
            write(chunk: Buffer, encoding, callback) {
              let f = new File([chunk], `${i}-${path.basename(input.value)}`);
              openai.audio.transcriptions
                .create({
                  file: f,
                  model: "gpt-4o-transcribe",
                  prompt: input.caption,
                })
                .then((transcription) => {
                  result += transcription.text;
                  i++;
                  callback();
                })
                .catch(() => callback(new Error("Error transcribing")));
            },
            final() {
              resolve();
            },
          });

          ffmpeg(str)
            .outputOptions([
              "-f segment",
              "-segment-time 600",
              "-reset_timestamps 1",
              "-map 0:a",
            ])
            .on("end", async () => {})
            .on("error", reject)
            .pipe(outputStream, {
              end: true,
            });
        });
      } else {
        const f = new File([data], path.basename(input.value));
        const transcription = await openai.audio.transcriptions.create({
          file: f,
          model: "gpt-4o-transcribe",
          prompt: input.caption,
        });
        result = transcription.text;
      }
      inp.push({
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: result,
          },
        ],
      });
    }

    return openai.responses.create({
      model,
      input: inp,
      previous_response_id: input.previousResponseId,
    });
  }
}
