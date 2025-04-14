import { ResponsesModel } from "openai/resources/shared";
import { AppDataSource } from "../data-source";
import { AgentModel } from "../entity/AgentModel";
import { openai } from "../neuro";
import OAI from "openai/resources";
import axios, { AxiosResponse } from "axios";
import path from "path";
import { Transcription } from "./Transcription";
import { DialogFile } from "../entity/assistants/DialogFile";

const manager = AppDataSource.manager;

/**
 * Interface for any input data
 */
interface IInputData {
  /**
   * The type of input
   */
  type: "text" | "voice" | "document" | "image";

  /**
   * The text or url or the id of file/image/audio
   */
  value: string;

  /**
   * The caption of the file
   */
  caption?: string;

  /**
   * User ID (NECESSARY FOR FILE INPUTS ONLY)
   */
  userId?: string;

  /**
   * Dialog ID (NECESSARY FOR FILE INPUTS ONLY)
   */
  dialogId?: number;

  /**
   * Previous response id from OpenAI
   */
  previousResponseId?: string;

  /**
   * Maximum output tokens
   */
  maxTokens: number;

  /**
   * Transcription of the voice
   */
  transcription?: Transcription;
}

/**
 * AI Agents class
 * - This class represents an abstraction of an AI agent. It is not constructed, it is "Built" on top of an AgentModel - the record in the database.
 * - After creation, the instance has to be initialized
 * - The class has one static method to facilitate image generation
 * - The agent class IS NOT RESPONSIBLE for managing conversation state, models and token counting - it is the consumer`s responsibility
 * - As for now, the class is dependent on OpenAI. In near future, it will be rebuilt to account for claude/mixtral
 * - Handoffs are also in development - possibly even cross-platform
 * - The class only adds files to dialogs - nothing more
 */
export class Agent {
  private _initialized: boolean = false;

  /**
   * Whether the agent model has been fetched or not. If the agent is built from a pre-fetched model, it is set to true. If not, it is set to true after initialization.
   */
  public get initialized(): boolean {
    return this._initialized;
  }

  private _id: number;

  /**
   * The id of the model in the database
   */
  public get id(): number {
    return this._id;
  }

  private _model: AgentModel;

  /**
   * The Agent model instance. If not pre-fetched, it will only be available after initialization.
   */
  public get model(): AgentModel {
    return this._model;
  }

  /**
   * Sets the id of the model to later fetch the agent model from the database. Initialized will be set to false.
   * @param id
   */
  constructor(id: number);

  /**
   * Builds an agent from a pre-fetched model. Initialized will be set to true.
   * @param model
   */
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

  /**
   * If not initiaized, will fetch the model and build the agent from it. Initialized will change to true.
   */
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

  /**
   * Static method to generate an image using Dall-E
   * @param input Prompt
   * @param size Size of the output image. For Dall-e 2, it is 256*256, 512*512 or 1024*1024. For Dall-e 3, it is 1024*1024, 1792*1024 or 1024*1792. Default value is 1024*1024
   * @param model Which model of the two to use. Defaults to dall-e-3
   * @returns Image url
   */
  public static async createImage(
    input: string,
    size:
      | "256x256"
      | "512x512"
      | "1024x1024"
      | "1792x1024"
      | "1024x1792" = "1024x1024",
    model: "dall-e-3" | "dall-e-2" = "dall-e-3",
  ): Promise<string> {
    const res = await openai.images.generate({
      prompt: input,
      model,
      n: 1,
      quality: "standard",
      size,
    });
    return res.data[0].url!;
  }

  /**
   * Run the model on input
   * @param input Input data object
   * @param model model to use
   * @returns Response from OpenAI
   */
  public async run(
    input: IInputData,
    model: ResponsesModel = "gpt-4o",
  ): Promise<OAI.Responses.Response> {
    if (!this.initialized) throw new Error("Not initialized");
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

      const dFile = new DialogFile();
      dFile.dialog.id = input.dialogId!;
      dFile.user.chatId = input.userId!;
      await manager.save(dFile);


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
    } else if (input.type === "voice") {
      if (!input.transcription) throw new Error("Transcription not provided");
      const result = await input.transcription.transcribe();
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
      store: true,
      top_p: this._model.topP,
      temperature: this._model.temperature,
      max_output_tokens: input.maxTokens
    });
  }
}
