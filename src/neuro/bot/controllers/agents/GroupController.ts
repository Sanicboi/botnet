import { InlineKeyboardButton } from "node-telegram-bot-api";
import { Bot } from "../../../Bot";
import { IController } from "../../Controller";
import { AppDataSource } from "../../../../data-source";
import { AgentGroup } from "../../../../entity/assistants/AgentGroup";
import { Btn } from "../../../utils";
import { User } from "../../../../entity/User";
import { AgentModel } from "../../../../entity/assistants/AgentModel";


const manager = AppDataSource.manager;


/**
 * This class manages the grouping of agents
 */
export class GroupController implements IController {


    /**
     * Constructor
     * @param bot Bot instance
     */
    constructor(private bot: Bot) {

    }

    /**
     * Binds the controller to the bot
     */
    public bind() {
        this.bot.bot.onText(/\/neuro/, async (msg) => {
            await this.onGroups(msg.from!.id, '1');
        })
        this.bot.addCQListener(async (q, user) => {
            if (q.data?.startsWith('groups-')) {
                await this.onGroups(+user.chatId, q.data.substring(7));
            }
            if (q.data?.startsWith('group-')) {
                await this.onGroup(+user.chatId, q.data.substring(6));
            }
        });
    }

    /**
     * Helper for mapping the groups to buttons
     * @param groups Groups array
     * @returns Buttons array
     */
    private mapGroupsToButtons(groups: AgentGroup[]): InlineKeyboardButton[][] {
        return groups.map<InlineKeyboardButton[]>(el => Btn(el.name, `group-${el.id}`));
    }


    /**
     * Helper for mapping the agents to the buttons
     * @param agents Agents array
     * @returns Buttons array
     */
    private mapAgentsToButtons(agents: AgentModel[]): InlineKeyboardButton[][] {
        return agents.map<InlineKeyboardButton[]>(el => Btn(el.name, `agent-${el.id}`))
    }

    /**
     * Helper to get the buttons of groups (1 or 2)
     * @param number 1 or 2, even though typed as a number
     * @returns Buttons array
     */
    private async getGroupsButtons(number: number): Promise<InlineKeyboardButton[][]> {
        let result: InlineKeyboardButton[][] = [];
        const groups = await manager.find(AgentGroup, number === 1 ? {
            take: 6,
            order: {
                name: 'ASC'
            }
        } : {
            skip: 6,
            order: {
                name: 'ASC'
            }
        });
        result = this.mapGroupsToButtons(groups);
        if (number === 1) {
            result.push(Btn("🤖Свободный режим", "agent-4"));
            result.push(Btn("Следующая страница", "groups-2"))
        } else {
            result.push(Btn("🖼️Дизайн и генерация картинок", "images"));
            result.push(Btn("Предыдущая страница", "groups-1"));
        }

        return result;
    }

    /**
     * Handler for the groups events
     * @param user User
     * @param idx groups idx as a string
     */
    private async onGroups(chatId: number, idx: string) {
        await this.bot.bot.sendMessage(chatId, 'Выберите категорию сотрудников', {
            reply_markup: {
                inline_keyboard: (await this.getGroupsButtons(+idx))
            }
        });
    }

    /**
     * Handler for the group events
     * @param user User
     * @param id group id as a string
     */
    private async onGroup(chatId: number, id: string) {
        const agents = await manager.find(AgentModel, {
            order: {
                name: 'ASC'
            },
            where: {
                groupId: +id
            }
        });

        const buttons = this.mapAgentsToButtons(agents);
        if (+id === 6) {
            buttons.push(Btn("🎧Транскрибатор аудио", "audio"));
            buttons.push(Btn("📝Суммаризатор аудио", "audiosum"));
        }

        await this.bot.bot.sendMessage(chatId, 'Выберите сотрудника', {
            reply_markup: {
                inline_keyboard: buttons
            }
        });
    }
}