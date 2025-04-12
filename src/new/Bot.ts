import TelegramBot, { Message } from "node-telegram-bot-api";
import { User } from "../entity/User";
import { AppDataSource } from "../data-source";


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

    public onAbout(f: (msg: Message) => Promise<any>) {
        this.bot.onText(/\/about/, f)
    }

    public onHelp(f: (msg: Message) => Promise<any>) {
        this.bot.onText(/\/help/, f);
    }

    public onDialogs(f: (user: User) => Promise<any>) {
        this.bot.onText(/\/dialogs/, async (msg) => {
            const user = await manager.findOne(User, {
                where: {
                    chatId: String(msg.from!.id)
                },
                relations: {
                    dialogs: {
                        agent: {
                            group: true
                        }
                    }
                }
            });
            if (!user) return;
            await f(user);
        });
    }

    
}