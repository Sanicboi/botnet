export class OpenAIError extends Error {


    constructor(message: string) {
        super(`OpenAI error: ${message}`);
        this.name = "OpenAIError";
    }
}