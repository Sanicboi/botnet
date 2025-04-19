import { AppDataSource } from "../../data-source";
import { AgentModel } from "../../entity/AgentModel";
import { User } from "../../entity/User";
import { Btn } from "../../neuro/utils";
import { Bot } from "../Bot";
import { DialogController } from "../DialogController";

const manager = AppDataSource.manager;

export class CopyWriterAgent {
  constructor(
    private bot: Bot,
    private dialogController: DialogController,
  ) {
    this.bot.onCopyWriterStyles(this.styles.bind(this));
    this.bot.onCopyWriterStyle(this.style.bind(this));
    this.bot.onCopyWriterTone(this.tone.bind(this));
  }

  private async styles(user: User) {
    user.agentId = 1;
    user.agent!.id = 1;
    await manager.save(user);
    const agent = await manager.findOneBy(AgentModel, {
      id: user.agentId!,
    });
    if (!agent) throw new Error("Agent not found");
    await this.bot.bot.sendMessage(+user.chatId, agent.firstMessage, {
      reply_markup: {
        inline_keyboard: [
          Btn(`Официальный`, `textstyle-official`),
          Btn(`Научный`, `textstyle-scientific`),
          Btn(`Публицистический`, `textstyle-public`),
          Btn(`Художественный`, `textstyle-fiction`),
          Btn(`Разговорный`, `textstyle-informal`),
          Btn(`Рекламный`, `textstyle-ad`),
        ],
      },
    });
  }

  private async style(user: User, style: string) {
    user.dialogueData += `Стиль текста: ${style}\n`;
    await manager.save(user);
    await this.bot.bot.sendMessage(
      +user.chatId,
      `${user.dialogueData}\nВыберите тон текста.`,
      {
        reply_markup: {
          inline_keyboard: [
            Btn(`Профессиональный`, `texttone-Профессиональный`),
            Btn(`Дружелюбный`, `texttone-Дружелюбный`),
            Btn(`Эмоциональный`, `texttone-Эмоциональный`),
            Btn(`Ироничный`, `texttone-Ироничный`),
            Btn(`Информативный`, `texttone-Информативный`),
            Btn(`Воодушевляющий`, `texttone-Воодушевляющий`),
            Btn(`Дерзкий`, `texttone-Дерзкий`),
            Btn(`Спокойный / уравновешенный`, `texttone-Спокойный`),
          ],
        },
      },
    );
  }

  private async tone(user: User, tone: string) {
    user.dialogueData += `Тон текста: ${tone}\n`;
    await manager.save(user);
    await this.dialogController.createDialog(
      user,
      1,
      `${user.dialogueData}\nОтлично, со стилем и тоном определились! 😉\n\nТеперь для создания текста мне необходимо получить от тебя вводную информацию:\n1)Тема\n2)Для кого создается текст  (студенты, инвесторы…)\n3)Размер текста по времени (5 мин; 10 мин; 30 мин)\n\nОтвет пришли мне в ответном сообщении!\nОжидаю информацию)😉`,
    ); // TODO: set agent id
  }
}
