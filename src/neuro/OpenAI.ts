import { User } from "../entity/User";
import { CallbackQuery, Message } from "node-telegram-bot-api";
import { Router } from "./router";
import { bot, formatter, openai } from ".";
import { Btn } from "./utils";
import { Thread } from "../entity/assistants/Thread";
import { MessageFormatter } from "../utils/MessageFormatter";
import { Action } from "../entity/assistants/Action";
import axios from "axios";
import { v4 } from "uuid";
import path from "path";
import fs from "fs";
import mime from "mime-types";
import { MessageCreateParams } from "openai/resources/beta/threads/messages";
import { FileUpload } from "../entity/assistants/FileUpload";
import { wait } from "../utils/wait";
//@ts-ignore
import docx from "html-to-docx";
import { OutputBotFormatter } from "./output/formatter";
import { AudioInput } from "./AudioInput";

interface IRunData {
  prompt: string;
  thread: Thread | null;
}


/**
 * This class is a helper class that makes it easy to use OpenAI
 */

export class OpenAI {
  /**
   * Create a new thread
   * @param q Callback Query object
   * @param u User object
   * @param actId Action ID
   * @returns Nothing
   */
  public static async createThread(q: CallbackQuery, u: User, actId: string) {
    
    const act = await Router.manager.findOneBy(Action, {
      id: actId,
    });
    await Router.manager.save(u);
    const t = await openai.beta.threads.create();
    const thread = new Thread();
    thread.id = t.id;
    thread.actionId = actId;
    thread.userId = u.chatId;
    thread.user = u;
    await Router.manager.save(thread);
    u.threadId = thread.id;
    u.thread = thread;
    await Router.manager.save(u);

    switch (actId) {
      case "asst_14B08GDgJphVClkmmtQYo0aq":
        await bot.sendMessage(
          +thread.userId,
          "Отлично, с размером определились."
        );
        await bot.sendMessage(+thread.userId, act!.welcomeMessage);
        break;
      case "asst_1BdIGF3mp94XvVfgS88fLIor":
        await bot.sendMessage(
          +thread.userId,
          `${u.dialogueData}\nОтлично, со стилем и тоном определились! 😉\n\nТеперь для создания текста мне необходимо получить от тебя вводную информацию:\n1)Тема\n2)Для кого создается текст  (студенты, инвесторы…)\n3)Размер текста по времени (5 мин; 10 мин; 30 мин)\n\nОтвет пришли мне в ответном сообщении!\nОжидаю информацию)😉`,
          {
            reply_markup: {
              inline_keyboard: [
                Btn(
                  "Вернуться к выбору стиля и тона",
                  "ac-asst_1BdIGF3mp94XvVfgS88fLIor"
                ),
              ],
            },
          }
        );
        break;
      default:
        await bot.sendMessage(+thread.userId, act!.welcomeMessage);
        break;
    }

    if (act?.exampleFile) {
      const rs = fs.createReadStream(
        path.join(process.cwd(), "assets", act.exampleFile)
      );
      await bot.sendDocument(+thread.userId, rs, {
        caption: "Пример промпта",
      });
    }

    await bot.sendMessage(+thread.userId, "Модель для генерации:", {
      reply_markup: {
        inline_keyboard: [
          Btn(
            `${u.model === "gpt-4o-mini" ? "✅" : ""} GPT 4 Omni mini`,
            "aimodel-gpt-4o-mini"
          ),
          Btn(
            `${u.model === "gpt-4o" ? "✅" : ""} GPT 4 Omni`,
            "aimodel-gpt-4o"
          ),
          Btn(
            `${u.model === "gpt-4-turbo" ? "✅" : ""} GPT 4 Turbo`,
            "aimodel-gpt-4-turbo"
          ),
        ],
      },
    });
  }

  /**
   * Internal method to get the necessary data for the run
   * @param msg Message object
   * @param u User (expecting a user with Thread fetched)
   * @param send Whether to send the generating message or not
   * @param isVoice Whether the action is "voice"
   * @returns false if can't run, otherwise data of the run
   */
  public static async setupRun(
    msg: Message,
    u: User,
    send: boolean = true,
  ): Promise<false | IRunData> {
    const t = u.thread
    if (!t && !u.usingVoice) return false;
    const data = u.data.find(el => el.assistantId === t?.action.assistantId);
    const res =
      (msg.text ?? "") +
      "\n" +
      u.dialogueData
      + "\n" + (data ? data?.text : '');
    
    u.dialogueData = "";
    await Router.manager.save(u);

    if (u.addBalance === 0 && u.leftForToday === 0) {
      await bot.sendMessage(
        msg.from!.id,
        "❌Упс! У вас закончились токены.\nЧтобы продолжить пользоваться ботом, вам нужно оформить подписку или купить отдельный комплект токенов…"
      );
      if (u.subscription !== "none") {
        // is subscribed
        await wait(2);
        await bot.sendMessage(
          msg.from!.id,
          `⚪️Ваша подписка:\n⤷${u.subscription}\n\n⚪️ Ваш комплект токенов на сегодня закончился :(\n\nКупите  отдельный комплект токенов, чтобы продолжить наслаждаться всем фукционалом бота без ограничений!\n\n`,
          {
            reply_markup: {
              inline_keyboard: [Btn("Купить пакет токенов", "b-tokens")],
            },
          }
        );
      } else {
        await wait(2);
        await bot.sendMessage(
          msg.from!.id,
          `⚪️Ваша подписка:\n⤷ Ваша предыдущая подписка истекла \n\n⚪️ Ваш комплект токенов:\n⤷ ❌ Ваши токены закончились :(\n\nКупите подписку или отдельный комплект токенов, чтобы наслаждаться всем фукционалом бота без ограничений!\n\n⤷ 💪 Подписка дает вам до 135.000 токенов в сутки;\n\n⤷ 🤖 Доступ к GPT-o1, GPT-o1 Mini, GPT-4 Omni, GPT-4 Omni Mini, GPT-4 Turbo и др…\n\n⤷\n⚡ Мгновенные ответы без ожидания;\n⤷ 🎙 Распознавание голосовых сообщений и озвучка текста;\n\n⤷ 👩‍🎨 Доступ к Dalle-3 (генерация изображений) и другие режимы;\n\nОформить подписку можно всего в пару действий с помощью банковской карты\n\nПодписку можно отменить в любой момент за 1 секунду.\n`,
          {
            reply_markup: {
              inline_keyboard: [
                Btn("Купить пакет токенов", "b-tokens"),
                Btn("Купить подписку", "b-sub"),
              ],
            },
          }
        );
      }
      return false;
    }
    if (send) {
      await bot.sendMessage(msg.from!.id, "генерирую ответ ✨...");
    }

    if (t && !t.firstMsg) {
      t.firstMsg = res;
      await Router.manager.save(t);
    };
    return {
      thread: t,
      prompt: res,
    };
  }

  public static async setupRunCQ(
    msg: CallbackQuery,
    u: User,
    send: boolean = true,
    isVoice: boolean = false
  ): Promise<Pick<IRunData, "thread"> | false> {
    const t = u.thread;
    if (!t && !isVoice) return false;
    if (u.addBalance === 0 && u.leftForToday === 0) {
      await bot.sendMessage(
        msg.from!.id,
        "❌Упс! У вас закончились токены.\nЧтобы продолжить пользоваться ботом, вам нужно оформить подписку или купить отдельный комплект токенов…"
      );
      if (u.subscription !== "none") {
        // is subscribed
        await wait(2);
        await bot.sendMessage(
          msg.from!.id,
          `⚪️Ваша подписка:\n⤷${u.subscription}\n\n⚪️ Ваш комплект токенов на сегодня закончился :(\n\nКупите  отдельный комплект токенов, чтобы продолжить наслаждаться всем фукционалом бота без ограничений!\n\n`,
          {
            reply_markup: {
              inline_keyboard: [Btn("Купить пакет токенов", "b-tokens")],
            },
          }
        );
      } else {
        await wait(2);
        await bot.sendMessage(
          msg.from!.id,
          `⚪️Ваша подписка:\n⤷ Ваша предыдущая подписка истекла \n\n⚪️ Ваш комплект токенов:\n⤷ ❌ Ваши токены закончились :(\n\nКупите подписку или отдельный комплект токенов, чтобы наслаждаться всем фукционалом бота без ограничений!\n\n⤷ 💪 Подписка дает вам до 135.000 токенов в сутки;\n\n⤷ 🤖 Доступ к GPT-o1, GPT-o1 Mini, GPT-4 Omni, GPT-4 Omni Mini, GPT-4 Turbo и др…\n\n⤷\n⚡ Мгновенные ответы без ожидания;\n⤷ 🎙 Распознавание голосовых сообщений и озвучка текста;\n\n⤷ 👩‍🎨 Доступ к Dalle-3 (генерация изображений) и другие режимы;\n\nОформить подписку можно всего в пару действий с помощью банковской карты\n\nПодписку можно отменить в любой момент за 1 секунду.\n`,
          {
            reply_markup: {
              inline_keyboard: [
                Btn("Купить пакет токенов", "b-tokens"),
                Btn("Купить подписку", "b-sub"),
              ],
            },
          }
        );
      }
      return false;
    }
    if (send) {
      await bot.sendMessage(msg.from!.id, "генерирую ответ ✨...");
    }
    return {
      thread: t,
    };
  }

  /**
   * This method runs the model on a text message
   * @param msg Message object
   * @param u User (Thread.Action fetched)
   * @returns Nothing
   */
  public static async runText(msg: Message, u: User) {
    const data = await this.setupRun(msg, u);
    if (!data) return;
    

    await this.run(msg, u, data, {
      content: msg.text!,
      role: "user",
    });
  }

  /**
   * This method handles voice messages
   * @param msg Message object
   * @param u User (Thread.Action and Data)
   * @param generate Whether text should be generated after the transcription
   * @param asFile Whether the document attached is consideered a voice message
   * @returns Nothing
   */
  public static async runVoice(
    msg: Message,
    u: User,
    generate: boolean,
    asFile: boolean = false
  ) {
    const data = await this.setupRun(msg, u, !asFile);
    if (!data) return;
    if (asFile && !msg.audio) return;
    if (!asFile && !msg.voice) return;

    let url: string;
    url = await bot.getFileLink(
      asFile ? msg.audio!.file_id : msg.voice!.file_id
    );

    let audioFile = new AudioInput(url);
    await audioFile.initFromUrl(u);
    console.log(audioFile);
    if (asFile) {
      // Prompt for transcription
      await bot.sendMessage(
        msg.from!.id,
        `Транскрибация будет стоить ${audioFile.getCost()} токенов. Хотите продолжить?`,
        {
          reply_markup: {
            inline_keyboard: [
              Btn("Да", `transcribe-${audioFile.inDB.id}`),
              Btn("Нет", `no-transcribe`),
            ],
          },
        }
      );
    } else {
      audioFile = new AudioInput(audioFile.inDB.id);
      const result = await audioFile.transcribe(u);
      if (generate) {
        await this.run(msg, u, data, {
          content: result,
          role: "user",
        });
      } else {
        const buf = Buffer.from(result, 'utf-8');
        await bot.sendDocument(msg.from!.id, buf, {}, {
          contentType: 'text/plain',
          filename: 'result.txt'
        });
      }
    }
  }

  /**
   * This method runs the model on photo message
   * @param msg Message object
   * @param u User (Threads, Action and Data fetched)
   * @returns Nothing
   */
  public static async runPhoto(msg: Message, u: User) {
    const data = await this.setupRun(msg, u);
    if (!data) return;

    if (!msg.photo) return;

    const photo = msg.photo.sort((a, b) => b.file_size! - a.file_size!)[0];
    const url = await bot.getFileLink(photo.file_id);

    await this.run(msg, u, data, {
      content: [
        {
          image_url: {
            url,
            detail: "auto",
          },
          type: "image_url",
        },
        {
          text: msg.text ?? u.thread?.actionId === "asst_ll21CQHhbyffqq63W2IXRzln" ? 'Реши задачу с картинки' : "Входные данные в виде картинки",
          type: "text",
        },
      ],
      role: "user",
    });
  }

  /**
   * This method runs the model on document message
   * @param msg Message object
   * @param u User (Threads, Data and Action fetched)
   * @returns Nothing
   */
  public static async runDocument(msg: Message, u: User) {
    const data = await this.setupRun(msg, u);
    if (!data) return;

    if (!msg.document) return;

    const url = await bot.getFileLink(msg.document.file_id);
    const type = mime.lookup(path.extname(url));
    console.log(type);

    console.log(msg.caption);
    const res = await axios.get(url, {
      responseType: "arraybuffer",
    });
    const file = new File([res.data], v4() + path.extname(url), {
      type: type || "text/plain",
    });

    const f = await openai.files.create({
      purpose: "assistants",
      file,
    });

    const upload = new FileUpload();
    upload.id = f.id;
    upload.userId = u.chatId;
    upload.thread = data.thread!;
    upload.threadId = data.thread!.id;
    await Router.manager.save(upload);

    await this.run(msg, u, data, {
      role: "user",
      content: msg.caption ?? "Входные данные в виде файла",
      attachments: [
        {
          file_id: f.id,
          tools: [
            {
              type: "file_search",
            },
          ],
        },
      ],
    });
  }

  /**
   * This method resets the context
   * @param msg Message object
   * @returns Nothing
   */
  public static async deleteThread(q: CallbackQuery) {
    const u = await Router.manager.findOne(User, {
      where: {
        chatId: String(q.from.id),
      },
      relations: {
        files: true,
      },
    });
    if (!u) return;
    const threadId = q.data!.substring(4); // del-...

    const files = await Router.manager.find(FileUpload, {
      where: {
        userId: u.chatId,
        threadId,
      },
    });

    for (const file of files) {
      await openai.files.del(file.id);
      await Router.manager.remove(file);
    }

    await openai.beta.threads.del(threadId);
    await Router.manager.delete(Thread, threadId);
    await bot.sendMessage(q.from.id, "Контекст успешно удален");
  }

  /**
   * Run the model
   * @param msg Message object
   * @param u User object (thread.action fetched)
   * @param data Run data
   * @param params Message content params
   */
  public static async run(
    msg: Message | CallbackQuery,
    u: User,
    data: Pick<IRunData, "thread">,
    params: MessageCreateParams
  ) {
    if (!data.thread) return;
    await openai.beta.threads.messages.create(data.thread.id, params);
    const str = openai.beta.threads.runs.stream(data.thread.id, {
      assistant_id: u.thread?.actionId!,
      model: u.model,
    });

    const messages = await str.finalMessages();
    const run = await str.finalRun();

    const asText = messages.map((el) => {
      if (el.content[0].type === "text") {
        return el.content[0].text.value;
      }
      return "";
    });

    await this.sendResult(msg, u, asText, run.usage!.total_tokens);
  }

  /**
   * This method sends the result of the generation to the user
   * @param msg Message Object
   * @param u User object (Thread.Action fetched)
   * @param messages Messages to send
   * @param tokenCount Token count
   */
  private static async sendResult(
    msg: Message | CallbackQuery,
    u: User,
    messages: string[],
    tokenCount: number
  ) {
    const cost =
      (tokenCount / 1000000) *
      (u.model === "gpt-4o-mini" ? 0.6 : u.model === "gpt-4o" ? 10 : 30) *
      100;
    if (u.leftForToday > 0) {
      u.leftForToday -= cost;
      u.leftForToday = Math.max(0, u.leftForToday);
    } else if (u.addBalance > 0) {
      u.addBalance -= cost;
      u.addBalance = Math.max(0, u.addBalance);
    }
    await Router.manager.save(u);

    const action = await Router.manager.findOneBy(Action, {
      id: u.thread?.actionId!,
    });
    if (!action) return;

    for (const m of messages) {
      await formatter.respondOpenai(msg.from!.id, m, action.format);
    }

    if (u.countTokens) {
      await bot.sendMessage(
        msg.from!.id,
        `Количество токенов: ${Math.round((cost / 34) * 10000)}`
      );
    }
  }
}
