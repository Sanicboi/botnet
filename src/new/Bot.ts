import TelegramBot, { Message } from "node-telegram-bot-api";
import { User } from "../entity/User";
import { AppDataSource } from "../data-source";
import { FindOptionsRelations, RelationOptions } from "typeorm";

const manager = AppDataSource.manager;
export class Bot {
  public readonly bot: TelegramBot;

  constructor() {
    this.bot = new TelegramBot(process.env.NEURO_TOKEN ?? "", {
      polling: true,
    });
    this.bot.setMyCommands([
      {
        command: "about",
        description: "🤝О нас (SmartComrade)",
      },
      {
        command: "help",
        description: "🤖О боте (справка)",
      },
      {
        command: "dialogs",
        description: "✉️Диалоги",
      },
      {
        command: "neuro",
        description: "🧠Нейро-сотрудники",
      },
      {
        command: "balance",
        description: "💳Баланс & подписка",
      },
      {
        command: "ref",
        description: "🏅Реферальная программа",
      },
      {
        command: "free",
        description: "🎁Бесплатные токены",
      },
      {
        command: "settings",
        description: "⚙️Настройки",
      },
      {
        command: "terms",
        description: "📜Условия использования & политика",
      },
    ]);
  }

  private async getUser(
    qOrMsg: {
      from?: {
        id: number;
      };
    },
    relations: FindOptionsRelations<User> = {}
  ): Promise<User> {
    const user = await manager.findOne(User, {
      where: {
        chatId: String(qOrMsg.from!.id),
      },
      relations,
    });
    if (!user) throw new Error("User not found");
    return user;
  }

  public onAbout(f: (msg: Message) => Promise<any>) {
    this.bot.onText(/\/about/, f);
  }

  public onHelp(f: (msg: Message) => Promise<any>) {
    this.bot.onText(/\/help/, f);
  }

  public onDialogs(f: (user: User) => Promise<any>) {
    this.bot.onText(/\/dialogs/, async (msg) => {
      const user = await this.getUser(msg, {
        dialogs: {
          agent: {
            group: true,
          },
        },
      });
      if (!user) return;
      await f(user);
    });
  }

  public onCreateDialog(f: (user: User, agentId: number) => Promise<any>) {
    this.bot.on("callback_query", async (q) => {
      if (q.data?.startsWith("agent-")) {
        const user = await this.getUser(q);
        if (!user) return;
        const agentId = +q.data.substring(6);
        await f(user, agentId);
      }
    });
  }

  public onDeleteDialog(f: (user: User, dialogId: number) => Promise<any>) {
    this.bot.on("callback_query", async (q) => {
      if (q.data?.startsWith("delete-")) {
        const user = await this.getUser(q, {
          dialogs: true
        });
        await f(user, +q.data.substring(7));
      }
    });
  }
}
