import TelegramBot from "node-telegram-bot-api";



export class UnknownError extends Error {
    constructor(message: string, point: string, reporter: TelegramBot) {
        super(message);

        console.log(`WARNING: Unknown Error at ${point}: ${message}`);
        reporter.sendMessage(2074310819, `WARNING: Unknown Error at ${point}: ${message}`).catch(e => console.log(`Error reporting: ${e}`));
    }
};


export class InvalidInputError extends Error {
    constructor(message: string, reporter: TelegramBot) {
        super(message);
        console.log(`WARNING: Invalid Input: ${message}`);
        reporter.sendMessage(2074310819, `WARNING: Invalid Input: ${message}`).catch(e => console.log(`Error reporting: ${e}`));
    }
}