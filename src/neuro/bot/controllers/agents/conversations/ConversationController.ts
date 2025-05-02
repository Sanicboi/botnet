import { InlineKeyboardButton } from "node-telegram-bot-api";
import { User } from "../../../../../entity/User";
import { Bot } from "../../../../Bot";
import { Btn } from "../../../../utils";
import { IController } from "../../../Controller";
import { api } from "../../../../apis/API";
import { AppDataSource } from "../../../../../data-source";

const manager = AppDataSource.manager;

export class ConversationController implements IController {
  public bind() {}

  constructor(private bot: Bot) {}

  private async onConversations(user: User) {
    if (user.conversations.length === 0)
      return await this.bot.bot.sendMessage(+user.chatId, `У Вас нет диалогов`);
    await this.bot.bot.sendMessage(
      +user.chatId,
      `Здесь вы можете вернуться к ранее проведенным диалогам и коммуникации с ИИ агентами. Возвращение к диалогу, позволяет сохранить контекст коммуникации и продолжить суть диалога. `,
      {
        reply_markup: {
          inline_keyboard: [
            Btn("Избранные диалоги", "featured-conversations"),
            Btn("Недавние диалоги", "all-conversations"),
          ],
        },
      }
    );
  }

  private async onFeaturedConversations(user: User) {
    const conversations = user.conversations.filter((el) => el.featured);
    const btns: InlineKeyboardButton[][] = [];

    for (const c of conversations) {
      const res = await api.conversationTopic(user, c);
      btns.push(Btn(res, `conversation-${c.id}`));
    }

    await this.bot.bot.sendMessage(
      +user.chatId,
      "💡Это ваши избранные диалоги!\nВы можете вернуться к любому из них или удалить диалог из избранного!",
      {
        reply_markup: {
          inline_keyboard: [
            ...btns,
            Btn("Удалить все избранные диалоги", "delete-featured-conversations"),
            Btn("Экспорт избранных диалогов", "export-featured-conversations"),
          ],
        },
      }
    );
  }

  private async onAllConversations(user: User) {
    const conversations = user.conversations.filter(el => !el.featured);
    const btns: InlineKeyboardButton[][] = [];
    for (const c of conversations) {
      btns.push(Btn(
        `Диалог #${c.id}`,
        `conversation-${c.id}`
      ))
    }
  }

  private async onConversation(user: User, id: number) {
    const conversation = user.conversations.find(el => el.id === id);
    if (!conversation) return;

    if (conversation.featured) {
      const summarized = await api.conversationTopic(user, conversation);
      await this.bot.bot.sendMessage(+user.chatId, `Избранный диалог #${conversation.id}:\n\n⤷ Режим чата: ${conversation.agent.group.name} - ${conversation.agent.name}\n⤷Дата начала: ${conversation.createdAt.toLocaleDateString("ru")}\n\nСуммаризация: ${summarized}\n\n`, {
        reply_markup: {
          inline_keyboard: [
            Btn(`Удалить диалог`, `delete-conversation-${conversation.id}`),
            Btn(`Продолжить диалог`, `continue-conversation-${conversation.id}`)
          ]
        }
      })
    } else {
      await this.bot.bot.sendMessage(+user.chatId, `Избранный диалог #${conversation.id}:\n\n⤷ Режим чата: ${conversation.agent.group.name} - ${conversation.agent.name}\n⤷Дата начала: ${conversation.createdAt.toLocaleDateString("ru")}\n\n`, {
        reply_markup: {
          inline_keyboard: [
            Btn(`Удалить диалог`, `delete-conversation-${conversation.id}`),
            Btn(`Продолжить диалог`, `continue-conversation-${conversation.id}`)
          ]
        }
      })
    }
  }

  private async onContinueConversation(user: User, id: number) {
    const conversation = user.conversations.find(el => el.id === id);
    if (!conversation) return;
    user.agent = conversation.agent;
    conversation.active = true;
    await manager.save(conversation);
    await manager.save(conversation);
    await this.bot.bot.sendMessage(+user.chatId, 'Диалог продолжен!');
  }

  public async onDeleteConversation(user: User, id: number, send: boolean = false) {
    const conversation = user.conversations.find(el => el.id === id);
    if (!conversation) return;
    for (const file of conversation.files) {
      await api.deleteFile(file.id, file.storedIn);
      await manager.remove(file);
    }
    await manager.remove(conversation);

    if (send) {
      await this.bot.bot.sendMessage(+user.chatId, 'Диалог удален');
      
    }
  }


}
