import { InlineKeyboardButton } from "node-telegram-bot-api";
import { AppDataSource } from "../data-source";
import { Dialog } from "../entity/assistants/Dialog";
import { User } from "../entity/User";
import { Bot } from "./Bot";
import { Btn } from "../neuro/utils";

const manager = AppDataSource.manager;
/**
 * This class is responsible for managing conversations
 * - This class DOES give the conversations ans helps store their IDs
 * - This class also DOES summarize the conversations
 * - This class DOES count the tokens in a conversation
 */
export class DialogController {

    constructor(private bot: Bot) { 
        bot.onDialogs(this.getDialogs.bind(this));
    }


    private async getDialogs(user: User) {  
        let result: InlineKeyboardButton[][] = [];
        for (const dialog of user.dialogs) {
            result.push(Btn(`${dialog.agent.group.name} - ${dialog.agent.name}: ${dialog.summarizedData}`.substring(0, 50) + '...', `dialog-${dialog.id}`));
        }

        if (result.length === 0) return await this.bot.bot.sendMessage(+user.chatId, `У Вас нет диалогов`);
        await this.bot.bot.sendMessage(+user.chatId, `Ваши диалоги: `, {
            reply_markup: {
                inline_keyboard: result
            }
        });
    }

    private async createDialog() {

    }
}