import { User } from "../entity/User";
import { CallbackQuery, Message } from "node-telegram-bot-api";
import { Router } from "./router";
import { bot, openai } from ".";
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
import docx from 'html-to-docx';

interface IRunData {
  prompt: string;
  thread: Thread;
}

let agreementsMap = new Map<string, string>();
agreementsMap.set("Договор о создании юридического лица\n", "offers-1");
agreementsMap.set("Договор о совместной деятельности\n", "offers-2");
agreementsMap.set("Договор займа\n", "offers-3");
agreementsMap.set("Договор авторского заказа\n", "offers-4");
agreementsMap.set("Договор купли продажи\n", "offers-5");
agreementsMap.set("Договор оказания услуг\n", "offers-7");
agreementsMap.set("Трудовой договор\n", "offers-6");
agreementsMap.set("Договор оферты\n", "offers-8");

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
    u.actionId = actId;
    const act = await Router.manager.findOneBy(Action, {
      id: actId,
    });
    await Router.manager.save(u);
    const t = await openai.beta.threads.create();
    const thread = new Thread();
    thread.id = t.id;
    thread.actionId = u.actionId;
    thread.userId = u.chatId;
    await Router.manager.save(thread);

    switch (u.actionId) {
      case "asst_14B08GDgJphVClkmmtQYo0aq":
        await bot.sendMessage(
          +thread.userId,
          "Отлично, с размером определились.",
        );
        await bot.sendMessage(+thread.userId, act!.welcomeMessage);
        break;
      case "asst_WHhZd8u8rXpAHADdjIwBM9CJ":
        await bot.sendMessage(
          +u.chatId,
          `Приветствую!👋 Я AI составитель договоров. Я помогу тебе составить "${u.agreementType.replace("\n", "")}" \n🔶Для того, чтобы составить договор, мне необходима вводная информация.\nПришли мне вводную информацию ответным сообщением или файлом (word)\n\nОжидаю информацию)😉`,
        );
        await bot.sendMessage(
          +u.chatId,
          `Ниже указал вводную информацию, которая мне необходима:\n👇\n\n${MessageFormatter.readTextFromFile(agreementsMap.get(u.agreementType)! + ".txt")}`,
        );
        break;
      case "asst_1BdIGF3mp94XvVfgS88fLIor":
        await bot.sendMessage(
          +thread.userId,
          `${u.textStyle ?? "Стиль не выбран"}\n${u.textTone ?? "Тон не выбран"}\nОтлично, со стилем и тоном определились! 😉\n\nТеперь для создания текста мне необходимо получить от тебя вводную информацию:\n1)Тема\n2)Для кого создается текст  (студенты, инвесторы…)\n3)Размер текста по времени (5 мин; 10 мин; 30 мин)\n\nОтвет пришли мне в ответном сообщении!\nОжидаю информацию)😉`,
          {
            reply_markup: {
              inline_keyboard: [
                Btn("Вернуться к выбору стиля и тона", "ac-asst_1BdIGF3mp94XvVfgS88fLIor")
              ]
            }
          }
        );
        break;
      default:
        await bot.sendMessage(+thread.userId, act!.welcomeMessage);
        break;
    }

    if (act?.exampleFile) {
      const rs = fs.createReadStream(path.join(process.cwd(), "assets", act.exampleFile))
      await bot.sendDocument(+thread.userId, rs, {
        caption: "Пример промпта",
      });
    }

    await bot.sendMessage(+thread.userId, "Модель для генерации:", {
      reply_markup: {
        inline_keyboard: [
          Btn(
            `${u.model === "gpt-4o-mini" ? "✅" : ""} GPT 4 Omni mini`,
            "aimodel-gpt-4o-mini",
          ),
          Btn(
            `${u.model === "gpt-4o" ? "✅" : ""} GPT 4 Omni`,
            "aimodel-gpt-4o",
          ),
          Btn(
            `${u.model === "gpt-4-turbo" ? "✅" : ""} GPT 4 Turbo`,
            "aimodel-gpt-4-turbo",
          ),
        ],
      },
    });
  }

  /**
   * Internal method to get the necessary data for the run
   * @param msg Message object
   * @param u User (expecting a user with Threads fetched)
   * @returns false if can't run, otherwise data of the run
   */
  private static async setupRun(
    msg: Message,
    u: User,
  ): Promise<false | IRunData> {
    const t = u.threads.find((t) => t.actionId === u.actionId);
    if (!t) return false;
    const res =
      (msg.text ?? "") +
      "\n" +
      u.textStyle +
      u.textTone +
      u.offerSize +
      u.docType +
      u.agreementType;
    u.textStyle = "";
    u.textTone = "";
    u.offerSize = "";
    u.docType = "";
    u.agreementType = "";
    await Router.manager.save(u);

    if (u.addBalance === 0 && u.leftForToday === 0) {
      await bot.sendMessage(msg.from!.id, "❌Упс! У вас закончились токены.\nЧтобы продолжить пользоваться ботом, вам нужно оформить подписку или купить отдельный комплект токенов…");
      if (u.subscription !== 'none') { // is subscribed
        await wait(2);
        await bot.sendMessage(msg.from!.id, `⚪️Ваша подписка:\n⤷${u.subscription}\n\n⚪️ Ваш комплект токенов на сегодня закончился :(\n\nКупите  отдельный комплект токенов, чтобы продолжить наслаждаться всем фукционалом бота без ограничений!\n\n`, {
          reply_markup: {
            inline_keyboard: [
              Btn("Купить пакет токенов", "b-tokens"),
            ]
          }
        })
      } else {
        await wait(2);
        await bot.sendMessage(msg.from!.id, `⚪️Ваша подписка:\n⤷ Ваша предыдущая подписка истекла \n\n⚪️ Ваш комплект токенов:\n⤷ ❌ Ваши токены закончились :(\n\nКупите подписку или отдельный комплект токенов, чтобы наслаждаться всем фукционалом бота без ограничений!\n\n⤷ 💪 Подписка дает вам до 135.000 токенов в сутки;\n\n⤷ 🤖 Доступ к GPT-o1, GPT-o1 Mini, GPT-4 Omni, GPT-4 Omni Mini, GPT-4 Turbo и др…\n\n⤷\n⚡ Мгновенные ответы без ожидания;\n⤷ 🎙 Распознавание голосовых сообщений и озвучка текста;\n\n⤷ 👩‍🎨 Доступ к Dalle-3 (генерация изображений) и другие режимы;\n\nОформить подписку можно всего в пару действий с помощью банковской карты\n\nПодписку можно отменить в любой момент за 1 секунду.\n`, {
          reply_markup: {
            inline_keyboard: [
              Btn("Купить пакет токенов", "b-tokens"),
              Btn("Купить подписку", "b-sub"),
            ],
          }
        })
      }
      return false;
    }
    await bot.sendMessage(msg.from!.id, "генерирую ответ ✨...");
    return {
      thread: t,
      prompt: res,
    };
  }

  /**
   * This method runs the model on a text message
   * @param msg Message object
   * @param u User (Threads fetched)
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
   * @param u User (Threads fetched)
   * @param generate Whether text should be generated after the transcription
   * @returns Nothing
   */
  public static async runVoice(msg: Message, u: User, generate: boolean) {
    const data = await this.setupRun(msg, u);
    if (!data) return;
    if (!msg.voice) return;

    const url = await bot.getFileLink(msg.voice.file_id);
    const res = await axios.get(url, {
      responseType: "arraybuffer",
    });
    const name = v4() + path.extname(url);
    fs.writeFileSync(path.join(process.cwd(), "voice", name), res.data);
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(path.join(process.cwd(), "voice", name)),
      model: "whisper-1",
    });

    fs.rmSync(path.join(process.cwd(), "voice", name));

    if (generate) {
      await this.run(msg, u, data, {
        content: transcription.text,
        role: "user",
      });
    } else {
      await bot.sendMessage(msg.from!.id, transcription.text);
    }
  }

  /**
   * This method runs the model on photo message
   * @param msg Message object
   * @param u User (Threads fetched)
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
          text: msg.text ?? "Входные данные в виде картинки",
          type: "text",
        },
      ],
      role: "user",
    });
  }

  /**
   * This method runs the model on document message
   * @param msg Message object
   * @param u User (Threads fetched)
   * @returns Nothing
   */
  public static async runDocument(msg: Message, u: User) {
    const data = await this.setupRun(msg, u);
    if (!data) return;

    if (!msg.document) return;

    const url = await bot.getFileLink(msg.document.file_id);
    const res = await axios.get(url, {
      responseType: "arraybuffer",
    });

    const file = new File([res.data], v4() + path.extname(url), {
      type: mime.lookup(path.extname(url)) || "text/plain",
    });

    const f = await openai.files.create({
      purpose: "assistants",
      file,
    });

    const upload = new FileUpload();
    upload.id = f.id;
    upload.userId = u.chatId;
    await Router.manager.save(upload);

    await this.run(msg, u, data, {
      role: "user",
      content: msg.text ?? "Входные данные в виде файла",
      attachments: [
        {
          file_id: f.id,
          tools: [
            {
              type: 'file_search'
            }
          ]
        },
      ],
    });
  }

  /**
   * This method resets the context
   * @param msg Message object
   * @returns Nothing
   */
  public static async deleteThread(msg: Message) {
    const u = await Router.manager.findOne(User, {
      where: {
        chatId: String(msg.from!.id),
      },
      relations: {
        action: {
          threads: true,
        },
        files: true,
      },
    });
    if (!u) return;
    if (u.actionId === "voice") {
      u.actionId = null;
      u.action = null;
      await Router.manager.save(u);
      await bot.sendMessage(
        msg.from!.id,
        "Транскрибация закончена. Выберите другую функцию",
      );
      return;
    }
    await Router.resetWaiters(u, true);
  }

  /**
   * Run the model
   * @param msg Message object
   * @param u User object
   * @param data Run data
   * @param params Message content params
   */
  private static async run(
    msg: Message,
    u: User,
    data: IRunData,
    params: MessageCreateParams,
  ) {
    await openai.beta.threads.messages.create(data.thread.id, params);
    const str = openai.beta.threads.runs.stream(data.thread.id, {
      assistant_id: u.actionId!,
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
   * @param u User object (Threads fetched)
   * @param messages Messages to send
   * @param tokenCount Token count
   */
  private static async sendResult(
    msg: Message,
    u: User,
    messages: string[],
    tokenCount: number,
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
      id: u.actionId!,
    });

    for (const m of messages) {
      if (action?.format === "html-file") {
        const b = Buffer.from(m, "utf-8");
        await Router.tryDeletePrevious(msg.message_id + 2, msg.from!.id);
        await bot.sendDocument(
          msg.from!.id,
          b,
          {
            caption: "Ваш ответ готов. Если нужно что-то еще - пишите.",
          },
          {
            contentType: "text/html",
            filename: "report.html",
          },
        );
      } else if (action?.format === "text") {
        await bot.sendMessage(msg.from!.id, m);
      } else if (action?.format === "word-file") {
        await Router.tryDeletePrevious(msg.message_id + 2, msg.from!.id);
        const doc: Buffer = await docx(m, null, {
          table: {
            row: {
              cantSplit: true
            }
          }
        });
        await bot.sendDocument(msg.from!.id, doc, {
          caption: "Ваш ответ готов. Если нужно что-то еще - пишите."
        }, {
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          filename: 'report.docx'
        });
      } 
    }

    if (u.countTokens) {
      await bot.sendMessage(
        msg.from!.id,
        `Количество токенов: ${Math.round((cost / 34) * 10000)}`,
      );
    }
  }
}
