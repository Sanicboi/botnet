import { Job, Worker } from "bullmq";
import { bot } from ".";
import { Thread } from "../entity/assistants/Thread";
import { Action } from "../entity/assistants/Action";
import { AppDataSource } from "../data-source";
import pino from "pino";
import { User } from "../entity/User";
import { Router } from "./router";
import { MessageFormatter } from "../utils/MessageFormatter";
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
  msgId: string;
}

interface IJobDelete extends IJob {
  task: "delete";
  sendResetMessage: boolean;
}

interface IJobImage extends IJob {
  task: "image";
  imageUrl: string;
  msgId: string;
}

interface IJobVoice extends IJob {
  task: "voice";
  text: string;
  msgId: string;
  result: string;
}

/**
 * This class is a single worker that processes back openai requests
 */
export class Handler {
  worker: Worker;

  /**
   * This creates a new Worker on the neuro back queue that processes incoming OpenAI queue requests
   */
  constructor() {
    this.worker = new Worker(
      "neuro",
      async (
        job: Job<IJobCreate | IJobRun | IJobDelete | IJobImage | IJobVoice>,
      ) => {
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
            const u = await manager.findOneBy(User, {
              chatId: String(j.userId),
            });
            if (!u) return;
          } else if (j.task === "delete") {
            if (j.sendResetMessage) {
              await bot.sendMessage(
                +j.userId,
                "Контекст успешно удален! Начните новый диалог",
              );
            }
          } else if (j.task === "run") {
            console.log("Run");
            const user = await manager.findOneBy(User, {
              chatId: j.userId,
            });
            if (!user) throw new Error("User not found");
            const cost =
              (j.tokenCount / 1000000) *
              (user.model === "gpt-4o-mini"
                ? 0.6
                : user.model === "gpt-4o"
                  ? 10
                  : 30) *
              100;
            if (user.leftForToday > 0) {
              logger.info("Case 1");
              user.leftForToday -= cost;
              user.leftForToday = Math.max(0, user.leftForToday);
            } else if (user.addBalance > 0) {
              logger.info("Case 2");
              user.addBalance -= cost;
              user.addBalance = Math.max(0, user.addBalance);
            }
            await manager.save(user);
            console.log("Run 2");

            for (const m of j.messages) {
              if (act?.format === "text") {
                await bot.sendMessage(+j.userId, m, {});
              } else if (act?.format === "html-file") {
                console.log("Run file");
                const b = Buffer.from(m, "utf-8");
                await Router.tryDeletePrevious(+j.msgId + 2, +j.userId);
                await bot.sendDocument(
                  +j.userId,
                  b,
                  {
                    caption: "Ваш ответ готов. Если нужно что-то еще - пишите.",
                  },
                  {
                    contentType: "text/html",
                    filename: "report.html",
                  },
                );
                console.log("Run file end");
              }
            }
            if (user.countTokens) {
              await bot.sendMessage(
                +user.chatId,
                `Количество токенов: ${Math.round((cost / 34) * 10000)}`,
              );
            }
          } else if (j.task === "image") {
            await Router.tryDeletePrevious(+j.msgId + 2, +j.userId);
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
          } else if (j.task === "voice") {
            await bot.sendMessage(+j.userId, j.result);
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
