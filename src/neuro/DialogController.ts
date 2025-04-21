import { InlineKeyboardButton } from "node-telegram-bot-api";
import { AppDataSource } from "../data-source";
import { Dialog } from "../entity/assistants/Dialog";
import { User } from "../entity/User";
import { Bot } from "./Bot";
import { Btn } from "./utils";
import { openai } from "../neuro";
import { AgentModel } from "../entity/assistants/AgentModel";
import { DataController } from "./DataController";

const manager = AppDataSource.manager;

/**
 * This class is responsible for managing conversations
 * - This class DOES give the conversations ans helps store their IDs
 * - This class also DOES summarize the conversations
 * - This class DOES count the tokens in a conversation
 */
export class DialogController {
  constructor(
    private bot: Bot,
    private dataController: DataController,
  ) {
    bot.onDialogs(this.dialogs.bind(this));
    bot.onCreateDialog(this.createDialog.bind(this));
    bot.onDeleteDialog(this.deleteDialog.bind(this));
    bot.onDialog(this.dialog.bind(this));
    bot.onContinueDialog(this.continueDialog.bind(this));
    bot.onAllDialogs(this.allDialogs.bind(this));
    bot.onFeaturedDialogs(this.featuredDialogs.bind(this));
    bot.onRemoveFeaturedDialog(this.removeFeaturedDialog.bind(this));
    bot.onMakeFeaturedDialog(this.makeFeaturedDialog.bind(this));
    bot.onDeleteFeaturedDialogs(this.deleteFeaturedDialogs.bind(this));
    bot.onDeleteAllDialogs(this.deleteAllDialogs.bind(this));
    bot.onExportFeaturedDialogs(this.exportFeaturedDialogs.bind(this));
  }

  private async dialogs(user: User) {

    if (user.dialogs.length === 0)
      return await this.bot.bot.sendMessage(+user.chatId, `У Вас нет диалогов`);
    await this.bot.bot.sendMessage(+user.chatId, `Здесь вы можете вернуться к ранее проведенным диалогам и коммуникации с ИИ агентами. Возвращение к диалогу, позволяет сохранить контекст коммуникации и продолжить суть диалога. `, {
      reply_markup: {
        inline_keyboard: [
          Btn('Избранные диалоги', 'featured-dialogs'),
          Btn('Остальные диалоги', 'all-dialogs'),
        ],
      },
    });
  }

  private async featuredDialogs(user: User) {
    const featuredDialogs = user.dialogs.filter((dialog) => dialog.featured);
    if (featuredDialogs.length === 0) return await this.bot.bot.sendMessage(+user.chatId, `У Вас нет избранных диалогов`);
    let result: InlineKeyboardButton[][] = [];

    for (const dialog of featuredDialogs) {
      result.push(Btn(dialog.firstMessage || `Диалог #${dialog.id}`, `dialog-${dialog.id}`));
    }

    await this.bot.bot.sendMessage(+user.chatId, `💡Это ваши избранные диалоги!\nВы можете вернуться к любому из них или удалить диалог из избранного!`, {
      reply_markup: {
        inline_keyboard: [
          ...result,
          Btn('Удалить все избранные диалоги', 'delete-featured-dialogs'),
          Btn('Экспорт избранных диалогов', 'export-featured-dialogs'),
        ]
      }
    });
  }

  private async allDialogs(user: User) {
    const allDialogs = user.dialogs.filter((dialog) => !dialog.featured);
    if (allDialogs.length === 0) return await this.bot.bot.sendMessage(+user.chatId, `У Вас нет диалогов`);
    let result: InlineKeyboardButton[][] = [];

    for (const dialog of allDialogs) {
      result.push(Btn(dialog.firstMessage || `Диалог #${dialog.id}`, `dialog-${dialog.id}`));
    }

    await this.bot.bot.sendMessage(+user.chatId, `💡Это ваши диалоги!\nВы можете вернуться к любому из них или удалить диалог!`, {
      reply_markup: {
        inline_keyboard: [
          ...result,
          Btn('Удалить все диалоги', 'delete-all-dialogs'),
        ]
      }
    });
  }

  public async createDialog(
    user: User,
    agentId: number,
    resetData: boolean = true,
    welcomeMessage?: string,
  ) {
    if (resetData) {
      await this.dataController.resetData(user);
    }
    const agent = await manager.findOne(AgentModel, {
      where: {
        id: agentId,
      },
    });
    if (!agent) return;
    const dialog = new Dialog();
    dialog.agent = new AgentModel();
    dialog.agent.id = agentId;
    dialog.user = user;
    await manager.save(dialog);
    user.currentDialogId = dialog.id;
    user.agentId = agentId
    user.agent = new AgentModel();
    user.agent.id = agentId;
    user.dialogs.push(dialog);
    await manager.save(user);

    await this.bot.bot.sendMessage(
      +user.chatId,
      welcomeMessage ?? agent.firstMessage,
      {
        reply_markup: {
          inline_keyboard:
            user.currentAudioAgent == null &&
            ![1, 2, 3].includes(user.agentId!) &&
            !user.usingImageGeneration && agent.examplePrompt
              ? [Btn("Взять из данных", "from-data")]
              : [],
        },
      },
    );
    await this.bot.bot.sendMessage(+user.chatId, "Модель для генерации:", {
      reply_markup: {
        inline_keyboard: [
          Btn(
            `GPT 4 Omni mini ${user.model === "gpt-4o-mini" ? "✅" : "❌"}`,
            "model-gpt-4o-mini",
          ),
          Btn(
            `GPT 4 Omni ${user.model === "gpt-4o" ? "✅" : "❌"}`,
            "model-gpt-4o",
          ),
          Btn(
            `GPT 4 Turbo ${user.model === "gpt-4-turbo" ? "✅" : "❌"}`,
            "model-gpt-4-turbo",
          ),
        ],
      },
    });

    if (agent.examplePrompt) {
      await this.bot.bot.sendDocument(+user.chatId, Buffer.from(agent.examplePrompt), {
        caption: 'Пример диалога с моделью',
      }, {
        contentType: 'text/plain',
        filename: 'example.txt',
      });
    }
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
    if (dialog.featured) {
      let lastMsg: string = 'Нет сообщений';
      let summarized: string = 'Нет данных';
      if (dialog.lastMsgId) {
        const sum = await openai.responses.create({
          model: "gpt-4o-mini",
          input: 'кратко суммаризируй весь предыдущий диалог',
          previous_response_id: dialog.lastMsgId,
        });
        
        const res = await openai.responses.retrieve(dialog.lastMsgId);
        lastMsg = res.output_text;
        summarized = sum.output_text;
      }

      await this.bot.bot.sendMessage(+user.chatId, `Избранный диалог #${dialog.id}:\n\n⤷ Количество сообщений: (сообщения по этому диалогу): ${dialog.msgCount}\n⤷ Режим чата: ${dialog.agent.group.name} - ${dialog.agent.name}\n⤷Дата начала: ${dialog.createdAt}\n\nСуммаризация: ${summarized}\n\n`, {
        reply_markup: {
          inline_keyboard: [
            Btn("Удалить диалог из избранного", `remove-featured-${dialog.id}`),
            Btn("Удалить диалог", `delete-dialog-${dialog.id}`),
            Btn("Вернуться к диалогу", `continue-dialog-${dialog.id}`),
          ],
        }
      });
      


    } else {
      await this.bot.bot.sendMessage(+user.chatId, `Диалог #${dialog.id}:\n\n⤷ Количество сообщений: (сообщения по этому диалогу): ${dialog.msgCount}\n⤷ Режим чата: ${dialog.agent.group.name} - ${dialog.agent.name}\n⤷Дата начала: ${dialog.createdAt}\n\n`, {
        reply_markup: {
          inline_keyboard: [
            Btn("Удалить диалог", `delete-dialog-${dialog.id}`),
            Btn("Вернуться к диалогу", `continue-dialog-${dialog.id}`),
            Btn("Сделать избранным", `make-featured-${dialog.id}`),
          ],
        }
      });
    }

    
  }

  private async removeFeaturedDialog(user: User, dialogId: number) {
    const dialog = await manager.findOne(Dialog, {
      where: {
        id: dialogId,
      },
    });
    if (!dialog) return;
    dialog.featured = false;
    await manager.save(dialog);
    await this.bot.bot.sendMessage(+user.chatId, "Диалог удален из избранного", {
      reply_markup: {
        inline_keyboard: [
          Btn("Назад", `dialog-${dialogId}`),
        ]
      }
    });
  }

  private async makeFeaturedDialog(user: User, dialogId: number) {
    const dialog = await manager.findOne(Dialog, {
      where: {
        id: dialogId,
      },
    });
    if (!dialog) return;
    dialog.featured = true;
    await manager.save(dialog);
    await this.bot.bot.sendMessage(+user.chatId, "Диалог добавлен в избранное", {
      reply_markup: {
        inline_keyboard: [
          Btn("Назад", `dialog-${dialogId}`),
        ]
      }
    });
  }
  private async deleteFeaturedDialogs(user: User) {
    const featuredDialogs = user.dialogs.filter((dialog) => dialog.featured);
    if (featuredDialogs.length === 0) return await this.bot.bot.sendMessage(+user.chatId, `У Вас нет избранных диалогов`);
    for (const dialog of featuredDialogs) {
      await this.deleteDialog(user, dialog.id);
    }
    await this.bot.bot.sendMessage(+user.chatId, "Все избранные диалоги удалены", {
      reply_markup: {
        inline_keyboard: [
          Btn("Назад", `dialogs`),
        ]
      }
    });
  }
  private async deleteAllDialogs(user: User) {
    for (const dialog of user.dialogs.filter((dialog) => !dialog.featured)) {
      await this.deleteDialog(user, dialog.id);
    }
    await this.bot.bot.sendMessage(+user.chatId, "Все диалоги удалены", {
      reply_markup: {
        inline_keyboard: [
          Btn("Назад", `dialogs`),
        ]
      }
    });
  }

  private async exportFeaturedDialogs(user: User) {
    const featuredDialogs = user.dialogs.filter((dialog) => dialog.featured);
    if (featuredDialogs.length === 0) return await this.bot.bot.sendMessage(+user.chatId, `У Вас нет избранных диалогов`);
    let result: string = '';
    for (const dialog of featuredDialogs) {
      result += `#${dialog.id}\n\n\n`
      let lastMsgId: string | null = null;
      if (dialog.lastMsgId)  {
        lastMsgId = dialog.lastMsgId;
      }

      while (lastMsgId) {
        const res = await openai.responses.retrieve(lastMsgId);
        const inputItems = await openai.responses.inputItems.list(res.id);
        let currentStr: string = '';
        for (const item of inputItems.data) {
          currentStr += `Вы:\n`;
          if (item.type === 'message' && item.role === 'user') {
            for (const c of item.content) {
              if (c.type === 'input_file') {
                currentStr += `Файл ${c.file_id}\n`;
              } else if (c.type === 'input_text') {
                currentStr += `${c.text}\n`;
              } else if (c.type === 'input_image') {
                currentStr += `Изображение ${c.file_id}\n`;
              }
            }
          }

          currentStr +='\n';
        }

        result = currentStr + `${dialog.agent.name}: ${res.output_text}\n` + result;
        lastMsgId = res.previous_response_id ?? null;
      }

      result += `---\n\n\n`;
    }

    await this.bot.bot.sendDocument(+user.chatId, Buffer.from(result), {
      caption: 'Избранные диалоги',
    }, {
      contentType: 'text/plain',
      filename: 'featured-dialogs.txt',
    });
    
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

    if (dialog.lastMsgId) {
      const r = await openai.responses.retrieve(dialog.lastMsgId);
      await this.bot.bot.sendMessage(+user.chatId, r.output_text);
    }
  }

  public getUserCurrentDialog(user: User): Dialog {
    console.log(user.dialogs);
    const result = user.dialogs.find((el) => el.id === user.currentDialogId);
    if (!result) throw new Error("Dialog not found");
    return result;
  }

  public async updateDialogLastMsg(dialog: Dialog, msgId: string) {
    dialog.lastMsgId = msgId;
    await manager.save(dialog);
  }
}
