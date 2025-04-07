import TelegramBot from "node-telegram-bot-api";
import { User } from "../entity/User";


/**
 * This class is responsible for managing conversations
 * - This class DOES give the conversations ans helps store their IDs
 * - This class also DOES summarize the conversations
 * - This class DOES count the tokens in a conversation
 */
export class DialogController {

    /**
     * Sets the listeners for the bot
     * @param bot Telegram Bot
     */
    constructor(private bot: TelegramBot) { }


    public async getCurrentDialog(user: User) {

    }
}