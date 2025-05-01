import { AppDataSource } from "../../../../data-source";
import { AIModel } from "../../../../entity/AIModel";
import { User } from "../../../../entity/User";
import { supportedAPIs } from "../../../apis/supportedModels";
import { Bot } from "../../../Bot";
import { Btn } from "../../../utils";
import { IController } from "../../Controller";

const manager = AppDataSource.manager;

export class ModelController implements IController {

    constructor(private bot: Bot) {

    }

    public bind() {
        this.bot.addCQListener(async (q, user) => {
            if (q.data?.startsWith('api-')) {
                await this.onSelectAPI(user, q.data.substring(4), false);
            }
            if (q.data?.startsWith('sapi-')) {
                await this.onSelectAPI(user, q.data.substring(5), true);
            }
            if (q.data?.startsWith('model-')) {
                await this.onSelectModel(user, q.data.substring(6), false);
            }
            if (q.data?.startsWith('smodel-')) {
                await this.onSelectModel(user, q.data.substring(7), true);
            }
        })
    }


    private async onSelectAPI(user: User, api: string, settings: boolean) {
        const models = await manager.findBy(AIModel, {
            api: api as supportedAPIs,
        });
        await this.bot.bot.sendMessage(+user.chatId, `Выберите модель`, {
            reply_markup: {
                inline_keyboard: models.map(el => Btn(el.id, `${settings ? 's' : ''}model-${el.id}`)) 
            }
        })
    }

    private async onSelectModel(user: User, model: string, settings: boolean) {
        user.model = new AIModel();
        user.model.id = model;
        await manager.save(user);

        if (settings) {
            await this.bot.bot.sendMessage(+user.chatId, 'Модель успешно изменена', {
                reply_markup: {
                    inline_keyboard: [
                        Btn('Назад', 'settings')
                    ]
                }
            });
        } else {
            // TODO
        }
    }
}