import { Job, Worker } from "bullmq";
import { bot } from ".";
import { Thread } from "../entity/assistants/Thread";
import { Action } from "../entity/assistants/Action";
import { AppDataSource } from "../data-source";
import pino from "pino";
import { User } from "../entity/User";
const logger = pino();

interface IJob {
  type: "neuro";
  task: string;
  userId: string;
  actionId: string;
}

interface IJobCreate extends IJob {
  task: "create";
  threadId: string;
}

interface IJobRun extends IJob {
  task: "run";
  messages: string[];
  tokenCount: number;
}

interface IJobDelete extends IJob {
  task: "delete";
}

interface IJobImage extends IJob {
  task: "image";
  imageUrl: string;
}

export class Handler {
  worker: Worker;

  constructor() {
    this.worker = new Worker(
      "neuro",
      async (job: Job<IJobCreate | IJobRun | IJobDelete | IJobImage>) => {
        try {
          const manager = AppDataSource.manager;
          const j = job.data;
          const act = await manager.findOne(Action, {
            where: {
              id: j.actionId,
            },
          });
          if (j.task === "create") {
            const thread = new Thread();
            thread.actionId = j.actionId;
            thread.userId = j.userId;
            thread.id = j.threadId;
            await manager.save(thread);
            await bot.sendMessage(+thread.userId, act!.welcomeMessage);
          } else if (j.task === "delete") {
            await bot.sendMessage(+j.userId, "Контекст удален.");
          } else if (j.task === "run") {
            const user = await manager.findOneBy(User, {
              chatId: j.userId
            });
            if (!user) throw new Error("User not found");
            const cost = ((j.tokenCount / 1000000) * (user.model === 'gpt-4o-mini' ? 0.6 : user.model === 'gpt-4o' ? 10 : 30) * 100);
            if (user.leftForToday >= 0) {
              user.leftForToday -= cost;
              user.leftForToday = Math.max(0, user.leftForToday);
            } else if (user.addBalance >= 0) {
              user.addBalance -= cost;
              user.addBalance = Math.max(0, user.addBalance);
            }
            await manager.save(user);

            for (const m of j.messages) {
              if (act?.format === "text") {
                await bot.sendMessage(+j.userId, m, {});
              } else if (act?.format === "html-file") {
                const b = Buffer.from(m, "utf-8");
                await bot.sendDocument(
                  +j.userId,
                  b,
                  {
                    caption: "Данный ассистент возвращает ответ в формате html",
                  },
                  {
                    contentType: "text/html",
                    filename: "report.html",
                  },
                );
              }
            }
            await bot.sendMessage(j.userId, `Отчет о задаче (Для тестов):\n\nКоличество реальных токенов (входные + выходные): ${j.tokenCount}\nЧто будет списано с баланса пользователя (завышено, входные токены считаются по стоимости выходных): ${cost}\nОна же, только в смарттокенах:${0.00034*cost}\nБаланс в рублях после решения задачи:${user.addBalance}\nВ смарттокенах: ${0.00034*user.addBalance}`);
          } else if (j.task === "image") {
            await bot.sendPhoto(+j.userId, j.imageUrl, {
              caption: "Результат",
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "1024x1024",
                      callback_data: "res-1024x1024",
                    },
                  ],
                  [
                    {
                      text: "1024x1792",
                      callback_data: "res-1024x1792",
                    },
                  ],
                  [
                    {
                      text: "1792x1024",
                      callback_data: "res-1792x1024",
                    },
                  ],
                  [
                    {
                      text: "Закончить генерацию",
                      callback_data: "stop-images",
                    },
                  ],
                ],
              },
            });
          }
          
        } catch (err) {
          logger.fatal(err);
        }
      },
      {
        connection: {
          host: "redis",
        },
      },
    );
  }
}
