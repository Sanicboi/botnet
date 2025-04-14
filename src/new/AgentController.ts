import axios from "axios";
import { AppDataSource } from "../data-source";
import { Dialog } from "../entity/assistants/Dialog";
import { User } from "../entity/User";
import { Agent } from "./Agent";
import { BalanceController } from "./BalanceController";
import { Bot } from "./Bot";
import { DialogController } from "./DialogController";
import { OutputController } from "./OutputController";
import { ImageAgent } from "./specialAgents/ImageAgent";
import { AudioAgent } from "./specialAgents/AudioAgent";
import { Transcription } from "./Transcription";
import { Converter } from "./Converter";




const manager = AppDataSource.manager;

/**
 * This class is responsible for all agent-specific controls of the telegram bot.
 * - This class DOES work with the database and IS RESPONSIBLE for handling models and the user`s interaction with them
 * - This class DOES NOT HANDLE user balance and token conversion, but it does count tokens from responses
 * - This class DOES NOT HANDLE conversations, only consumes the classes that handle it
 */
export class AgentController {

    private imageAgent: ImageAgent;
    private audioAgent: AudioAgent;

    /**
     * Sets the listeners for the bot
     * @param bot Telegram Bot
     */
    constructor(private bot: Bot, private balanceController: BalanceController, private dialogController: DialogController, private outputController: OutputController) {
        this.imageAgent = new ImageAgent(bot);
        this.audioAgent = new AudioAgent(bot, outputController, balanceController);
        this.bot.onTextInput(this.textInput.bind(this));
        this.bot.onVoiceInput(this.voiceInput.bind(this));
        this.bot.onDocInput(this.docInput.bind(this));
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
        }, user.model);

        await this.balanceController.editBalance(user, response.usage!.total_tokens);
        await this.dialogController.updateDialogLastMsg(dialog, response.id);
        const converted = await this.outputController.convert(response.output_text, user.outputFormat);
        await this.outputController.send(converted, user);
    }

    private async voiceInput(user: User, url: string) {
        const transcription = new Transcription(false, url);
        await transcription.setup();
        const costs = await transcription.getCost();
        let check = await this.balanceController.checkBalance(user, costs);
        if (!check.exists) return;
        
        await this.balanceController.editBalance(user, Converter.SMTTK(costs, user.model));
        check = await this.balanceController.checkBalance(user);
        const agent = new Agent(user.agent);
        let dialog: Dialog = this.dialogController.getUserCurrentDialog(user);
        const response = await agent.run({
            maxTokens: check.limit,
            type: 'voice',
            transcription: transcription,
            value: '',
            caption: '',
            previousResponseId: dialog.lastMsgId ?? undefined
        }, user.model);
        
        await this.balanceController.editBalance(user, response.usage!.total_tokens);
        const converted = await this.outputController.convert(response.output_text, user.outputFormat);
        await this.outputController.send(converted, user);
    }

    private async docInput(user: User, url: string) {
        const result = await this.balanceController.checkBalance(user);
        if (!result.exists) return;
        const agent = new Agent(user.agent);

        let dialog: Dialog = this.dialogController.getUserCurrentDialog(user);
        const response = await agent.run({
            maxTokens: result.limit,
            type: 'document',
            value: url,
            dialogId: dialog.id,
            previousResponseId: dialog.lastMsgId ?? undefined,
            userId: user.chatId
        }, user.model);

        await this.balanceController.editBalance(user, response.usage!.total_tokens);
        await this.dialogController.updateDialogLastMsg(dialog, response.id);
        const converted = await this.outputController.convert(response.output_text, user.outputFormat);
        await this.outputController.send(converted, user);
    }
    
}