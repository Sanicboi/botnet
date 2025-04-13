import { AppDataSource } from "../data-source";
import { Bot } from "./Bot";




const manager = AppDataSource.manager;

/**
 * This class is responsible for all agent-specific controls of the telegram bot.
 * - This class DOES work with the database and IS RESPONSIBLE for handling models and the user`s interaction with them
 * - This class DOES NOT HANDLE user balance and token conversion, but it does count tokens from responses
 * - This class DOES NOT HANDLE conversations
 */
export class AgentController {


    /**
     * Sets the listeners for the bot
     * @param bot Telegram Bot
     */
    constructor(private bot: Bot) {

    }

    private async

}