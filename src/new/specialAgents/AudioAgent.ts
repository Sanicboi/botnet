import { AppDataSource } from "../../data-source";
import { User } from "../../entity/User";
import { Btn } from "../../neuro/utils";
import { Bot } from "../Bot";
import { Transcription } from "../Transcription";



const manager = AppDataSource.manager;


export class AudioAgent {

    constructor(private bot: Bot) {


        bot.onCalculateCosts(this.calculateCosts.bind(this));
    }




    private async calculateCosts(user: User, url: string) {
        const transcription = new Transcription(false, url);
        const costs = await transcription.getCost();
        const results = await transcription.save(user);
        await this.bot.bot.sendMessage(+user.chatId, `Транскрибация будет стоить ${costs} токенов. Хотите продолжить?`, {
            reply_markup: {
                inline_keyboard: [
                    Btn("Да", `transcription-${results.id}`),
                    Btn("Нет", "transcription-no")
                ]
            }
        })
    }


}