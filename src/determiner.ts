import OpenAI from "openai";
import { User } from "./entity/User";
import gramjs from 'telegram';
import { Bot } from "./entity/Bot";
import { Queue } from "bullmq";
import TelegramBot from "node-telegram-bot-api";
import { Repository } from "typeorm";
import { Bitrix } from "./Bitrix";

interface Data {
    userPhone: string,
    dateTime: string,
    segment: string,
    comment: string          
}






export class Determiner {
    private openai: OpenAI;

    constructor(openai: OpenAI) {
        this.openai = openai;
    }

    public async sendDetermined(msg: string, user: User, bot: string, outQueue: Queue, manager: TelegramBot, repo: Repository<User>, num: string, gender: 'male' | 'female') {

        await this.openai.beta.threads.messages.create(user.threadId, {
             content: msg,
             role: 'user'
        });

        const run = this.openai.beta.threads.runs.stream(user.threadId, {
            assistant_id: gender === 'male' ? 'asst_SS8Ct1OvanqvxGeDRYbrM8sP' : 'asst_8RgJFwUqF11WAfl4uMcOlufE'
        }).on('end', async () => {
            let msgs = await run.finalMessages();
            const finalRun = await run.finalRun();
            for (const m of msgs) {
                await outQueue.add('send', {
                    bot: bot,
                    user: user.usernameOrPhone,
                    // @ts-ignore
                    text: m.content[0].text.value
                })
            }
            if (finalRun.status === 'requires_action' && finalRun.required_action.type === 'submit_tool_outputs') {
                // Отправь сообщение!
                user.finished = true;
                await repo.save(user);
                await manager.sendMessage(-1002244363083, `Согласована встреча с клиентом. Номер телефона бота: ${num}\nКлиент:${user.usernameOrPhone}`);

                const data: Data = JSON.parse(finalRun.required_action.submit_tool_outputs.tool_calls[0].function.arguments);
                const contactId = (await Bitrix.createContact(user.usernameOrPhone, data.userPhone, '')).data.result;
                const dealId = (await Bitrix.createDeal(num, data.dateTime, data.segment, data.comment)).data.result;
                await Bitrix.addContact(contactId, dealId);
                let newmsgs: OpenAI.Beta.Threads.Message[] = [];
                await this.openai.beta.threads.runs.submitToolOutputsStream(finalRun.thread_id, finalRun.id, {
                    tool_outputs: [
                        {
                            output: 'Встреча записана.',
                            tool_call_id: finalRun.required_action.submit_tool_outputs.tool_calls[0].id
                        }
                    ]
                }).on("messageDone", (e) => {
                    newmsgs.push(e);
                }).on('end',async () => {
                    for (const m of newmsgs) {
                        await outQueue.add('send', {
                            bot: bot,
                            user: user.usernameOrPhone,
                            // @ts-ignore
                            text: m.content[0].text.value
                        })
                    }
                }).finalMessages();
            }
        });
    }

}