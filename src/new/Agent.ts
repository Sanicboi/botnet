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

import { AgentModel } from "../entity/AgentModel";

interface IInputData {
    type: "text" | "audio" | "document" | "image";
    value: string;
    caption?: string;
    previousResponseId?: string;
}
export class Agent {
    
    public model: AgentModel;

    constructor(id: string);
    constructor(model: AgentModel);
    constructor(idOrModel: string | AgentModel) {
        if (typeof idOrModel === "string") {

        }
    }

    private async processInput(data: IInputData): Promise<any> {

    }

    public async run(data: IInputData) {
        
    }
}