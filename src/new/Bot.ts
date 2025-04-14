import TelegramBot, { CallbackQuery, Message } from "node-telegram-bot-api";
import { User } from "../entity/User";
import { AppDataSource } from "../data-source";
import { FindOptionsRelations, RelationOptions } from "typeorm";

const manager = AppDataSource.manager;
export class Bot {
  public readonly bot: TelegramBot;

  private cqListeners: ((q: CallbackQuery, user: User) => Promise<true | any>)[] = [];
  private freeTextListeners: ((msg: Message, user: User) => Promise<true | any>)[] = [];
  private voiceListeners: ((msg: Message, user: User) => Promise<true | any>)[] = [];

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
    this.cqListeners.push(async (q) => {
      if (q.data?.startsWith("agent-")) {
        const user = await this.getUser(q);
        if (!user) return;
        const agentId = +q.data.substring(6);
        await f(user, agentId);
      }
  });
  }

  public onDeleteDialog(f: (user: User, dialogId: number) => Promise<any>) {
    this.cqListeners.push(async (q) => {
      if (q.data?.startsWith("delete-")) {
        const user = await this.getUser(q, {
          dialogs: true
        });
        await f(user, +q.data.substring(7));
      }
    });
  }

  public onTextInput(f: (user: User, text: string) => Promise<any>) {
    this.freeTextListeners.push(async (msg, user) => {
      await f(user, msg.text!);
    })
  }

  public onGenerateImage(f: (user: User, text: string) => Promise<any>) {
    this.freeTextListeners.push(async (msg, user) => {
      if (user.usingImageGeneration) {
        await f(user, msg.text!);
        return true;
      }
    })
  }

  public onEnterImage(f: (user: User) => Promise<any>) {
    this.cqListeners.push(async (q, user) => {
      if (q.data === "images") {
        await f(user);
      }
    })
  }

  public onSetResolution(f: (user: User, res: string) => Promise<any>) {
    this.cqListeners.push(async (q, user) => {
      if (q.data?.startsWith('res-')) {
        await f(user, q.data.substring(4));
      }
    })
  }

  public onCalculateCosts(f: (user: User, url: string) => Promise<any>) {
    this.bot.on("audio", async (msg) => {
      if (!msg.audio) return;
      const user = await this.getUser(msg);
      const url = await this.bot.getFileLink(msg.audio.file_id);
      await f(user, url);
    })
  }

  public onTranscribeSaved(f: (user: User, id: string) => Promise<any>) {
    this.cqListeners.push(async (q, user) => {
      if (q.data?.startsWith("transcription-")) {
        await f(user, q.data.substring(14));
      }
    })
  }

  public onTranscribeNonSaved(f: (user: User, url: string) => Promise<any>) {
    this.voiceListeners.push(async (msg, user) => {
      if (user.agentId === 0) {
        const url = await this.bot.getFileLink(msg.voice!.file_id);
        await f(user, url);
      }
    })
  }

  public onVoiceInput(f: (user: User, url: string) => Promise<any>) {
    this.voiceListeners.push(async (msg, user) => {
      if (user.agentId !== 0) {
        const url = await this.bot.getFileLink(msg.voice!.file_id);
        await f(user, url);
      }
    })
  }

  public onDocInput(f: (user: User, url: string) => Promise<any>) {
    this.bot.on('document', async (msg) => {
      if (!msg.document) return;
      const user = await this.getUser(msg);
      const url = await this.bot.getFileLink(msg.document.file_id);
      await f(user, url);
    })
  }


  public setListeners() {
    this.bot.on('callback_query', async (q) => {
      const user = await this.getUser(q);
      for (const f of this.cqListeners) {
        const result = await f(q, user);
        if (result === true) break;
      }
    });
    this.bot.onText(/./, async (msg) => {
      if (msg.text && !msg.text.startsWith('/')) {
        const user = await this.getUser(msg);
        for (const f of this.freeTextListeners) {
          const result = await f(msg, user);
          if (result === true) break;
        }
      }
    });
    this.bot.on('voice', async (msg) => {
      if (!msg.voice) return;
      const user = await this.getUser(msg);
      for (const f of this.voiceListeners) {
        const result = await f(msg, user);
        if (result === true) break;
      }
    })
  }
}
