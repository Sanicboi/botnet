import { InlineKeyboardButton } from "node-telegram-bot-api";
import { Bot } from "../../../Bot";
import { IController } from "../../Controller";
import { AppDataSource } from "../../../../data-source";
import { AgentGroup } from "../../../../entity/assistants/AgentGroup";
import { Btn } from "../../../utils";
import { User } from "../../../../entity/User";
import { AgentModel } from "../../../../entity/assistants/AgentModel";

const manager = AppDataSource.manager;

/**
 * Занимается группировкой агентов
 */
export class GroupController implements IController {
  /**
   * конструктор
   * @param bot бот
   */
  constructor(private bot: Bot) {}

  /**
   * привязка
   */
  public bind() {
    this.bot.bot.onText(/\/neuro/, async (msg) => {
      await this.onGroups(msg.from!.id, "1");
    });
    this.bot.addCQListener(async (q) => {
      const user = await this.bot.getUser(q);
      if (q.data?.startsWith("groups-")) {
        await this.onGroups(+user.chatId, q.data.substring(7));
      }
      if (q.data?.startsWith("group-")) {
        await this.onGroup(+user.chatId, q.data.substring(6));
      }
    });
  }

  /**
   * Хэлпер
   * @param groups Группы
   * @returns Кнопки
   */
  private mapGroupsToButtons(groups: AgentGroup[]): InlineKeyboardButton[][] {
    return groups.map<InlineKeyboardButton[]>((el) =>
      Btn(el.name, `group-${el.id}`),
    );
  }

  /**
   * Хэлпер
   * @param agents Агенты
   * @returns Кнопки
   */
  private mapAgentsToButtons(agents: AgentModel[]): InlineKeyboardButton[][] {
    return agents.map<InlineKeyboardButton[]>((el) =>
      Btn(el.name, `agent-${el.id}`),
    );
  }

  /**
   * Хелпер
   * @param number 1 или 2 (номер надгруппы)
   * @returns кнопки
   */
  private async getGroupsButtons(
    number: number,
  ): Promise<InlineKeyboardButton[][]> {
    let result: InlineKeyboardButton[][] = [];
    const groups = await manager.find(
      AgentGroup,
      number === 1
        ? {
            take: 6,
            order: {
              name: "ASC",
            },
          }
        : {
            skip: 6,
            order: {
              name: "ASC",
            },
          },
    );
    result = this.mapGroupsToButtons(groups);
    if (number === 1) {
      result.push(Btn("🤖Свободный режим", "agent-4"));
      result.push(Btn("Следующая страница", "groups-2"));
    } else {
      result.push(Btn("🖼️Дизайн и генерация картинок", "images"));
      result.push(Btn("Предыдущая страница", "groups-1"));
    }

    return result;
  }

  /**
   * Обработка надгрупп
   * @param user пользователь
   * @param idx индекс надгруппы (строка 1 или 2)
   */
  private async onGroups(chatId: number, idx: string) {
    await this.bot.bot.sendMessage(chatId, "Выберите категорию сотрудников", {
      reply_markup: {
        inline_keyboard: await this.getGroupsButtons(+idx),
      },
    });
  }

  /**
   * Обработка групп
   * @param user пользователь
   * @param id айди группы (строка)
   */
  private async onGroup(chatId: number, id: string) {
    const agents = await manager.find(AgentModel, {
      order: {
        name: "ASC",
      },
      where: {
        groupId: +id,
      },
    });

    const buttons = this.mapAgentsToButtons(agents);
    if (+id === 6) {
      buttons.push(Btn("🎧Транскрибатор аудио", "audio"));
      buttons.push(Btn("📝Суммаризатор аудио", "audiosum"));
    }

    await this.bot.bot.sendMessage(chatId, "Выберите сотрудника", {
      reply_markup: {
        inline_keyboard: buttons,
      },
    });
  }
}
