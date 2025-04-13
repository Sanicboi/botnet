import { AppDataSource } from "../data-source";
import { Dialog } from "../entity/assistants/Dialog";
import { User } from "../entity/User";
import { Agent } from "./Agent";
import { BalanceController } from "./BalanceController";
import { Bot } from "./Bot";
import { DialogController } from "./DialogController";
import { OutputController } from "./OutputController";




const manager = AppDataSource.manager;

/**
 * This class is responsible for all agent-specific controls of the telegram bot.
 * - This class DOES work with the database and IS RESPONSIBLE for handling models and the user`s interaction with them
 * - This class DOES NOT HANDLE user balance and token conversion, but it does count tokens from responses
 * - This class DOES NOT HANDLE conversations, onlz consumes the classes that handle it
 */
export class AgentController {


    /**
     * Sets the listeners for the bot
     * @param bot Telegram Bot
     */
    constructor(private bot: Bot, private balanceController: BalanceController, private dialogController: DialogController, private outputController: OutputController) {

    }

    private async textInput(user: User, text: string) {
        const result = await this.balanceController.checkBalance(user);
        if (!result.exists) return;
        const agent = new Agent(user.agent);

        let dialog: Dialog = this.dialogController.getUserCurrentDialog(user);
        const response = await agent.run({
            maxTokens: result.limit,
            type: 'text',
            value: text,
            previousResponseId: dialog.lastMsgId ?? undefined
        });

        await this.balanceController.editBalance(user, response.usage!.total_tokens);
        await this.dialogController.updateDialogLastMsg(dialog, response.id);
        const converted = await this.outputController.convert(response.output_text, user.outputFormat);
        await this.outputController.send(converted, user);
    }

}