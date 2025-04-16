import { InlineKeyboardButton } from "node-telegram-bot-api";
import { AppDataSource } from "../data-source";
import { Dialog } from "../entity/assistants/Dialog";
import { User } from "../entity/User";
import { Bot } from "./Bot";
import { Btn } from "../neuro/utils";
import { AgentModel } from "../entity/AgentModel";
import { openai } from "../neuro";

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
    bot.onCreateDialog(this.createDialog.bind(this));
    bot.onDeleteDialog(this.deleteDialog.bind(this));
  }

  private async getDialogs(user: User) {
    let result: InlineKeyboardButton[][] = [];
    for (const dialog of user.dialogs) {
      result.push(
        Btn(
          `${dialog.agent.group.name} - ${dialog.agent.name}: ${dialog.summarizedData}`.substring(
            0,
            50,
          ) + "...",
          `dialog-${dialog.id}`,
        ),
      );
    }

    if (result.length === 0)
      return await this.bot.bot.sendMessage(+user.chatId, `У Вас нет диалогов`);
    await this.bot.bot.sendMessage(+user.chatId, `Ваши диалоги: `, {
      reply_markup: {
        inline_keyboard: result,
      },
    });
  }

  private async createDialog(user: User, agentId: number) {
    const agent = await manager.findOne(AgentModel, {
      where: {
        id: agentId,
      },
    });
    if (!agent) return;
    const dialog = new Dialog();
    dialog.agent.id = agentId;
    dialog.user = user;
    await manager.save(dialog);
    user.currentDialogId = dialog.id;
    await manager.save(user);

    await this.bot.bot.sendMessage(+user.chatId, agent.firstMessage);
  }

  private async deleteDialog(user: User, dialogId: number) {
    const dialog = await manager.findOne(Dialog, {
      where: {
        id: dialogId,
      },
      relations: {
        files: true,
      },
    });

    if (!dialog) return;

    for (const f of dialog.files) {
      await openai.files.del(f.id);
      await manager.remove(f);
    }
    dialog.files = [];
    await manager.remove(dialog);
    await this.bot.bot.sendMessage(+user.chatId, "Диалог удален");
  }

  public getUserCurrentDialog(user: User): Dialog {
    const result = user.dialogs.find((el) => el.id === user.currentDialogId);
    if (!result) throw new Error("Dialog not found");
    return result;
  }

  public async updateDialogLastMsg(dialog: Dialog, msgId: string) {
    dialog.lastMsgId = msgId;
    await manager.save(dialog);
  }
}
