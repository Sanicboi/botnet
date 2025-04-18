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
    bot.onDialogs(this.dialogs.bind(this));
    bot.onCreateDialog(this.createDialog.bind(this));
    bot.onDeleteDialog(this.deleteDialog.bind(this));
  }

  private async dialogs(user: User) {
    let result: InlineKeyboardButton[][] = [];
    for (const dialog of user.dialogs) {
      result.push(
        Btn(
          `#${dialog.id}: ${dialog.agent.group.name} - ${dialog.agent.name}`.substring(
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

  public async createDialog(user: User, agentId: number, welcomeMessage?: string) {
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

    await this.bot.bot.sendMessage(+user.chatId, welcomeMessage ?? agent.firstMessage);
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

  private async dialog(user: User, dialogId: number) {
    const dialog = user.dialogs.find((el) => el.id === dialogId)!;
    let data: string = "Нет данных";
    if (dialog.lastMsgId) {
      const summarized = await openai.responses.create({
        instructions: "Ты - профессиональный суммаризатор",
        input: "Определи тему диалога. В ответе напиши только тему.",
        model: "gpt-4o-mini",
        previous_response_id: dialog.lastMsgId,
        store: false,
      });
      data = summarized.output_text;
    }

    await this.bot.bot.sendMessage(
      +user.chatId,
      `Диалог #${dialog.id}:\n\nТема диалога: ${data}\nДата создания: ${dialog.createdAt}`,
      {
        reply_markup: {
          inline_keyboard: [
            Btn(`Продолжить диалог`, `continue-${dialog.id}`),
            Btn(`Удалить диалог`, `delete-${dialog.id}`),
          ],
        },
      },
    );
  }

  private async continueDialog(user: User, dialogId: number) {
    const dialog = user.dialogs.find((el) => el.id === dialogId)!;
    user.currentDialogId = dialog.id;
    user.agentId = dialog.agent.id;
    user.agent = dialog.agent;
    await manager.save(user);
    await this.bot.bot.sendMessage(
      +user.chatId,
      "Диалог успешно продолжен! Можете продолжать общение с ассистентом.",
    );
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
