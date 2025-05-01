import { Conversation } from "../../../../../entity/Conversation";
import { User } from "../../../../../entity/User";
import { api } from "../../../../apis/API";
import { Bot } from "../../../../Bot";
import { IController } from "../../../Controller";
import { HTMLOutputConverter } from "./HTMLOutputConverter";
//@ts-ignore
import docx from 'html-to-docx';

export class OutputController implements IController {

    private htmlConverter = new HTMLOutputConverter();

    constructor(private bot: Bot) {

    }

    public bind() {

    }

    public async sendOutput(data: string, user: User, conversation: Conversation) {
        if (user.outputFormat === 'text') {
            return await this.bot.bot.sendMessage(+user.chatId, data);
        }
        if (user.outputFormat === 'docx' || user.outputFormat === 'html') {
            const html = await this.htmlConverter.convert(conversation, user);
            if (user.outputFormat === 'html') return await this.bot.bot.sendDocument(+user.chatId, Buffer.from(html, 'utf-8'), {
                caption: 'Ответ сотрудника'
            }, {
                filename: 'report.html',
                contentType: 'text/html; charset=utf-8'
            });
            const result: Buffer = await docx(html, null, {
                table: {
                  row: {
                    cantSplit: true,
                  },
                },
            });

            await this.bot.bot.sendDocument(+user.chatId, result, {
                caption: 'Ответ сотрудника'
            }, {
                contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                filename: 'report.docx'
            });
        }

        if (user.outputFormat === 'audio') {
            const res = await api.openai.createSpeech(data, 'alloy');
            await this.bot.bot.sendAudio(+user.chatId, Buffer.from(res), {
                caption: 'Ответ ассистента'
            }, {
                contentType: 'audio/mpeg',
                filename: 'report.mp3'
            })
        }
    }
}