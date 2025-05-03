import TelegramBot, { CallbackQuery, Message } from "node-telegram-bot-api";
import { User } from "../entity/User";
import { AppDataSource } from "../data-source";
import { FindOptionsRelations, RelationOptions } from "typeorm";
import cron from "node-cron";
import { wait } from "../utils/wait";
import { Converter } from "./bot/controllers/balance/Converter";

const specialIds: number[] = [1, 2, 3];

const manager = AppDataSource.manager;

export class Bot {
  public readonly bot: TelegramBot;

  private cqListeners: ((q: CallbackQuery) => Promise<true | any>)[] = [];
  private freeTextListeners: ((msg: Message) => Promise<true | any>)[] = [];
  private voiceListeners: ((
    msg: Message,
    user: User,
  ) => Promise<true | any>)[] = [];

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
        command: "neuro",
        description: "🧠Нейро-сотрудники",
      },
      {
        command: "data",
        description: "📝Данные обо мне",
      },
      {
        command: "balance",
        description: "💳Баланс & подписка",
      },
      {
        command: "dialogs",
        description: "✉️Диалоги",
      },

      {
        command: "settings",
        description: "⚙️Настройки",
      },
      {
        command: "free",
        description: "🎁Бесплатные токены",
      },
      {
        command: "ref",
        description: "🏅Реферальная программа",
      },
      {
        command: "terms",
        description: "📜Условия использования & политика",
      },
    ]);

    this.bot.onText(/\/start/, async (msg) => {
      await this.getUser(msg);
      await this.bot.sendMessage(
        msg.from!.id,
        "Приветствую, дорогой друг!👋\n\nSmartComrade - это многофункциональная платформа с обученными нейро-сотрудниками разных направлений!\nЗдесь мы объединили лучшее из мира нейро-сетей в одном месте.\n\nСделай свою коммуникацию с нейро-сетями профессиональной вместе с нами)\n\nИ да, не нужны никакие зарубежные карты!))\n\nНе забудь забрать афигенные полезные материалы по нейро-сетям в нашем боте помощнике! @SC_NewsBot\nА также, будем рады видеть тебя в нашем канале: https://t.me/SmartComrade1",
      );
    });
  }

  public async addCQListener(listener: (q: CallbackQuery) => Promise<any>) {
    this.cqListeners.push(listener);
  }

  public async addFreeTextListener(
    listener: (msg: Message) => Promise<true | any>,
  ) {
    this.freeTextListeners.push(listener);
  }

  public async getUser(
    qOrMsg: {
      from?: {
        id: number;
      };
      text?: string;
    },
    relations: FindOptionsRelations<User> = {},
  ): Promise<User> {
    console.log(String(qOrMsg.from!.id));
    let user = await manager.findOne(User, {
      where: {
        chatId: String(qOrMsg.from!.id),
      },
      relations,
    });
    if (!user) {
      if (!qOrMsg.text) throw new Error("User not found");
      user = new User();
      user.chatId = String(qOrMsg.from!.id);
      const referralId = qOrMsg.text.split(" ")[1];
      if (referralId) {
        const creator = await manager.findOne(User, {
          where: {
            chatId: referralId,
          },
        });
        if (creator) {
          if (creator.inviteCount <= 29) {
            creator.inviteCount++;
            creator.addBalance += Converter.SMTRUB(7000);
            await manager.save(creator);
          }
        }
      }
      await manager.save(user);
    }
    return user;
  }

  public onUpdateTokens(f: (user: User) => Promise<any>) {
    cron.schedule("0 0 * * *", async () => {
      const users = await manager.find(User);

      for (const user of users) {
        await f(user);
      }
    });
  }



  public setListeners() {
    this.bot.on("callback_query", async (q) => {
      try {
        if (
          !q.data?.startsWith("ihavepaid-") &&
          !q.data?.startsWith("model-") &&
          q.message
        ) {
          await this.bot.deleteMessage(q.from.id, q.message?.message_id);
        }
        await wait(0.5);
        for (const f of this.cqListeners) {
          const result = await f(q);
          if (result === true) break;
        }
      } catch (e) {
        console.error(e);
      }
    });
    this.bot.onText(/./, async (msg) => {
      try {
        if (msg.text && !msg.text.startsWith("/")) {
          for (const f of this.freeTextListeners) {
            const result = await f(msg);
            if (result === true) break;
          }
        }
      } catch (e) {
        console.error(e);
      }
    });
    this.bot.on("voice", async (msg) => {
      if (!msg.voice) return;
      const user = await this.getUser(msg);
      for (const f of this.voiceListeners) {
        const result = await f(msg, user);
        if (result === true) break;
      }
    });
  }
}
