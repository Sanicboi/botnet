import { Conversation } from "../../entity/Conversation";
import { User } from "../../entity/User";
import { IResult, IRun } from "./AgentsAPI";
import { OpenAIApi } from "./openai";
import { supportedAPIs } from "./supportedModels";

class API {
  public openai: OpenAIApi = new OpenAIApi();

  constructor() {}

  public async run(run: IRun): Promise<IResult> {
    if (run.api === "openai") return await this.openai.run(run);
    throw new Error("API not found");
  }

  public async conversationTopic(user: User, conversation: Conversation): Promise<string> {
    if (user.model.api === 'openai') return await this.openai.getConversationTopic(conversation);
    throw new Error("API not found");
  }

  public async deleteFile(id: string, api: supportedAPIs) {
    if (api === 'openai') return await this.openai.deleteFile(id);
    throw new Error("Api not found");
  }
}

export const api = new API();
