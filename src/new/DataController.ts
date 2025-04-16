import { User } from "../entity/User";
import { Bot } from "./Bot";



export class DataController {



    constructor(private bot: Bot) {

    }

    private async myData(user: User) {
        await this.bot.bot.sendMessage(+user.chatId, "")
    }
}