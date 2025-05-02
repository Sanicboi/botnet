import { InlineKeyboardButton } from "node-telegram-bot-api";
import { User } from "../../../../../entity/User";
import { Bot } from "../../../../Bot";
import { Btn } from "../../../../utils";
import { IController } from "../../../Controller";
import { api } from "../../../../apis/API";

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
          inline_keyboard: btns,
        },
      }
    );
  }
}
