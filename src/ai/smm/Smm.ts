import TelegramBot from "node-telegram-bot-api";
import { Repository } from "typeorm";
import { SmmUser } from "../entity/SmmUser";
import { AppDataSource } from "../data-source";
import { SmmModel } from "./SmmModel";
import OpenAI from "openai";

export class Smm {
  public bot: TelegramBot = new TelegramBot(process.env.SMM_TOKEN ?? "", {
    polling: true,
  });
  private repo: Repository<SmmUser> = AppDataSource.getRepository(SmmUser);
  private model: SmmModel = new SmmModel(this.openai);

  constructor(private openai: OpenAI) {
    this.bot.setMyCommands([
      {
        command: "/start",
        description: "Начать новый диалог",
      },
    ]);
    this.onText = this.onText.bind(this);
    this.onStart = this.onStart.bind(this);
    this.onQuery = this.onQuery.bind(this);
    this.bot.onText(/./, this.onText);
    this.bot.onText(/\/start/, this.onStart);
    this.bot.on("callback_query", this.onQuery);
  }

  private async onText(msg: TelegramBot.Message) {
    if (!msg.text!.startsWith("/")) {
      let user = await this.repo.findOne({
        where: {
          id: String(msg.from!.id),
        },
      });
      if (!user) {
        user = new SmmUser();
        user.id = String(msg.from!.id);
        user.threadId = await this.model.createThread();
      }
      await this.repo.save(user);
      const response = await this.model.run(
        user!.threadId,
        `Напиши пост в стиле ${user.style}. Категория поста - ${user.category}.\n` +
          msg.text!,
      );
      for (const message of response) {
        await this.bot.sendMessage(msg.from!.id, message);
      }
    }
  }

  private async onStart(msg: TelegramBot.Message) {
    let user = await this.repo.findOne({
      where: {
        id: String(msg.from!.id),
      },
    });
    if (!user) {
      user = new SmmUser();
      user.id = String(msg.from!.id);
    } else {
      await this.model.deleteThread(user.threadId);
    }
    user.threadId = await this.model.createThread();
    await this.repo.save(user);
    await this.bot.sendMessage(msg.from!.id, "Выберите категорию поста", {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "информационный",
              callback_data: "cat-информационный",
            },
          ],
          [
            {
              text: "пользовательский",
              callback_data: "cat-пользовательский",
            },
          ],
          [
            {
              text: "полезный",
              callback_data: "cat-полезный",
            },
          ],
        ],
      },
    });
  }

  private async onQuery(q: TelegramBot.CallbackQuery) {
    let user = await this.repo.findOne({
      where: {
        id: String(q.from.id),
      },
    });

    if (!user) return;

    if (q.data?.startsWith("cat-")) {
      user.category = q.data.split("-")[1];
      await this.repo.save(user);
      await this.bot.sendMessage(q.from.id, "Выберите стиль", {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Мотивационный",
                callback_data: "st-Мотивационный",
              },
            ],
            [
              {
                text: "Деловой",
                callback_data: "st-Деловой",
              },
            ],
            [
              {
                text: "Экспертный",
                callback_data: "st-Экспертный",
              },
            ],
            [
              {
                text: "Обучающий",
                callback_data: "st-Обучающий",
              },
            ],
            [
              {
                text: "Разговорный",
                callback_data: "st-Разговорный",
              },
            ],
            [
              {
                text: "Научный",
                callback_data: "st-Научный",
              },
            ],
            [
              {
                text: "Рекламный",
                callback_data: "st-Рекламный",
              },
            ],
            [
              {
                text: "Вызывающий",
                callback_data: "st-Вызывающий",
              },
            ],
          ],
        },
      });
    } else {
      user.style = q.data!.split("-")[1];
      await this.repo.save(user);
      await this.bot.sendMessage(
        q.from.id,
        `Напиши пост в стиле ${user.style}. Категория поста - ${user.category}`,
      );
      await this.bot.sendMessage(
        q.from.id,
        "Это автоматически добавлено к промпту",
      );
    }
  }
}
