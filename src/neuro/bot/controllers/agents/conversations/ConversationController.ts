import { InlineKeyboardButton } from "node-telegram-bot-api";
import { User } from "../../../../../entity/User";
import { Bot } from "../../../../Bot";
import { Btn } from "../../../../utils";
import { IController } from "../../../Controller";
import { api } from "../../../../apis/API";
import { AppDataSource } from "../../../../../data-source";

const manager = AppDataSource.manager;

export class ConversationController implements IController {
  public bind() {
    this.bot.bot.onText(/\/dialogs/, async (msg) => {
      const user = await this.bot.getUser(msg, {
        conversations: true,
      });
      await this.onConversations(user);
    });

    this.bot.addCQListener(async (q) => {
      if (q.data === "conversations") {
        const user = await this.bot.getUser(q, {
          conversations: true,
        });
        await this.onConversations(user);
      }

      if (q.data === "featured-conversations") {
        const user = await this.bot.getUser(q, {
          conversations: true,
        });
        await this.onFeaturedConversations(user);
      }

      if (q.data === "all-conversations") {
        const user = await this.bot.getUser(q, {
          conversations: true,
        });
        this.onAllConversations(user);
      }

      if (q.data?.startsWith("conversation-")) {
        const user = await this.bot.getUser(q, {
          conversations: {
            agent: {
              group: true,
            },
          },
        });
        await this.onConversation(user, +q.data.substring(13));
      }

      if (q.data?.startsWith("toggle-featured-")) {
        const user = await this.bot.getUser(q, {
          conversations: true,
        });
        await this.onToggleFeatured(user, +q.data.substring(16));
      }

      if (q.data?.startsWith("continue-conversation-")) {
        const user = await this.bot.getUser(q, {
          conversations: {
            agent: true,
          },
        });
        await this.onContinueConversation(user, +q.data.substring(22));
      }

      if (q.data?.startsWith("delete-conversation-")) {
        const user = await this.bot.getUser(q, {
          conversations: {
            files: true,
          },
        });
        await this.onDeleteConversation(user, +q.data.substring(20), true);
      }

      if (
        q.data === "delete-featured-conversations" ||
        q.data === "delete-all-conversations"
      ) {
        const user = await this.bot.getUser(q, {
          conversations: {
            files: true,
          },
        });
        await this.onDeleteAllConversations(
          user,
          q.data === "delete-featured-conversations",
        );
      }

      if (q.data === "export-featured-conversations") {
        const user = await this.bot.getUser(q, {
          conversations: {
            agent: {
              group: true,
            },
          },
        });
        await this.onExportAllConversations(user);
      }
    });
  }

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
      },
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
            Btn(
              "Удалить все избранные диалоги",
              "delete-featured-conversations",
            ),
            Btn("Экспорт избранных диалогов", "export-featured-conversations"),
          ],
        },
      },
    );
  }

  private async onAllConversations(user: User) {
    const conversations = user.conversations.filter((el) => !el.featured);
    const btns: InlineKeyboardButton[][] = [];
    for (const c of conversations) {
      btns.push(Btn(`Диалог #${c.id}`, `conversation-${c.id}`));
    }

    await this.bot.bot.sendMessage(
      +user.chatId,
      `💡Это ваши диалоги!\nВы можете вернуться к любому из них или удалить диалог!`,
      {
        reply_markup: {
          inline_keyboard: [
            ...btns,
            Btn(`Удалить все диалоги`, `delete-all-conversations`),
          ],
        },
      },
    );
  }

  private async onConversation(user: User, id: number) {
    const conversation = user.conversations.find((el) => el.id === id);
    if (!conversation) return;

    if (conversation.featured) {
      const summarized = await api.conversationTopic(user, conversation);
      await this.bot.bot.sendMessage(
        +user.chatId,
        `Избранный диалог #${conversation.id}:\n\n⤷ Режим чата: ${conversation.agent.group.name} - ${conversation.agent.name}\n⤷Дата начала: ${conversation.createdAt.toLocaleDateString("ru")}\n\nСуммаризация: ${summarized}\n\n`,
        {
          reply_markup: {
            inline_keyboard: [
              Btn(`Удалить диалог`, `delete-conversation-${conversation.id}`),
              Btn(
                `Продолжить диалог`,
                `continue-conversation-${conversation.id}`,
              ),
              Btn(`Убрать из избранного`, `toggle-featured-${conversation.id}`),
            ],
          },
        },
      );
    } else {
      await this.bot.bot.sendMessage(
        +user.chatId,
        `Избранный диалог #${conversation.id}:\n\n⤷ Режим чата: ${conversation.agent.group.name} - ${conversation.agent.name}\n⤷Дата начала: ${conversation.createdAt.toLocaleDateString("ru")}\n\n`,
        {
          reply_markup: {
            inline_keyboard: [
              Btn(`Удалить диалог`, `delete-conversation-${conversation.id}`),
              Btn(
                `Продолжить диалог`,
                `continue-conversation-${conversation.id}`,
              ),
              Btn(`Добавить в избранные`, `toggle-featured-${conversation.id}`),
            ],
          },
        },
      );
    }
  }

  private async onToggleFeatured(user: User, id: number) {
    const conversation = user.conversations.find((el) => el.id === id);
    if (!conversation) return;
    conversation.featured = !conversation.featured;
    await manager.save(conversation);
    await this.bot.bot.sendMessage(
      +user.chatId,
      `Диалог ${conversation.featured ? "добавлен в избранные" : "удален из избранных"}`,
      {
        reply_markup: {
          inline_keyboard: [Btn("Назад", "conversations")],
        },
      },
    );
  }

  private async onContinueConversation(user: User, id: number) {
    const conversation = user.conversations.find((el) => el.id === id);
    if (!conversation) return;
    user.agent = conversation.agent;
    conversation.active = true;
    await manager.save(conversation);
    await manager.save(conversation);
    await this.bot.bot.sendMessage(+user.chatId, "Диалог продолжен!");
  }

  public async onDeleteConversation(
    user: User,
    id: number,
    send: boolean = false,
  ) {
    const conversation = user.conversations.find((el) => el.id === id);
    if (!conversation) return;
    for (const file of conversation.files) {
      await api.deleteFile(file.id, file.storedIn);
      await manager.remove(file);
    }
    await manager.remove(conversation);

    if (send) {
      await this.bot.bot.sendMessage(+user.chatId, "Диалог удален");
    }
  }

  private async onDeleteAllConversations(user: User, featured: boolean) {
    const conversations = user.conversations.filter(
      (el) => el.featured === featured,
    );
    for (const c of conversations) {
      for (const file of c.files) {
        await api.deleteFile(file.id, file.storedIn);
        await manager.remove(file);
      }
      await manager.remove(c);
    }
    await this.bot.bot.sendMessage(+user.chatId, `Диалоги удалены`, {
      reply_markup: {
        inline_keyboard: [Btn("Назад", "settings")],
      },
    });
  }

  private async onExportAllConversations(user: User) {
    const conversations = user.conversations.filter((el) => el.featured);

    let result = "";

    for (const c of conversations) {
      const data = await api.getConversation(c.apiId, c.api);
      result += `Диалог #${c.id}:\n`;
      for (const d of data) {
        result += `${d.role}:\n${d.content}\n`;
      }
      result += `\n\n\n`;
    }

    await this.bot.bot.sendDocument(
      +user.chatId,
      Buffer.from(result, "utf-8"),
      {
        caption: "Ваши диалоги",
      },
      {
        contentType: "text/plain",
        filename: "conversations.txt",
      },
    );
  }

  public async markAllAsInactive(user: User) {
    for (const c of user.conversations) {
      if (c.active) {
        c.active = false;
        await manager.save(c);
      }
    }
  }
}
