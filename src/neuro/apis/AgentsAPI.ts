import { Conversation } from "../../entity/Conversation";
import { User } from "../../entity/User";
import { supportedAPIs } from "./supportedModels";


export interface IRun {
    input: string;
    type: 'text' | 'image' | 'document';
    instructions?: string;
    store?: boolean;
    model: string;
    api: supportedAPIs;
    user: User;
    conversation?: Conversation;
    caption?: string;
    maxTokens?: number;
}

export interface IResult {
    content: string;
    conversationId: string;
    tokens: number;
}

/**
 *  
 * Интерфейс для стандартищации работы с различными апи агентов
 * Это стандарт для всех апи-классов агентов
 * 
*/ 
export interface IAgentsAPI {
    run: (data: IRun) => Promise<IResult>;
    
}