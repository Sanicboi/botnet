import { StringSession } from "telegram/sessions";
import { AppDataSource } from "./data-source";
import { Api, TelegramClient } from "telegram";
import { NewMessage } from "telegram/events";
import schedule from "node-schedule";
import OpenAI from "openai";
import { Bot } from "./entity/Bot";
import { User } from "./entity/User";
import TgBot from "node-telegram-bot-api";
import dayjs from "dayjs";
import cron from "node-cron";
const openAi = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
});

const wait = async (s: number) => {
  await new Promise((resolve, reject) => setTimeout(resolve, 1000 * s));
};
const startMessage =
  "Приветствую, меня зовут Сергей, я являюсь сооснователем бизнес клуба Legat Business. Хочу с Вами познакомиться и  понять по каким вопросам к Вам можно обращаться? Мы ищем интересные проекты в которые можно инвестировать, предпринимателей и экспертов для партнерства. Готовы направить к Вам нашу аудиторию в качестве клиентов. Видел Вас в нескольких чатах сообществ в телеграмм группах. Если требуется могу прислать информацию о себе для подтверждения.";
const startMessage2 =
  "У меня большое сообщество, думаю куда направить этот трафик. Для того чтобы наше взаимодействие было максимально продуктивным, хотелось бы уточнить где территориально работаете, с какими регионами? И готовы ли платить Агентское вознаграждение за привлечение клиентов? Если да то в каком процентном соотношении?";
AppDataSource.initialize()
  .then(async () => {
    const userRepo = AppDataSource.getRepository(User);
    const botRepo = AppDataSource.getRepository(Bot);
    const bots = await botRepo.find({
      take: 10
    });
    const manager = new TgBot(process.env.BOT_KEY, {
      polling: true,
    });

    manager.onText(/\/start/, async (msg) => {
      manager.sendMessage(
        msg.chat.id,
        "Я - менеджер ботов компании Legat Business"
      );
    });

    manager.onText(/\/send/, async (msg) => {
      const notTalked = await userRepo.find({
        where: {
          botid: null,
        },
      });
      let free = notTalked.length;

      for (const bot of bots) {
        const client = clients.get(bot.token);
        for (let i = 0; i < 15 && free > 0; i++) {
          
          const thread = await openAi.beta.threads.create({
            messages: [
              {
                content: startMessage,
                role: "assistant",
              },
            ],
          });

          notTalked[i].threadId = thread.id;
          notTalked[i].botid = bot.id;
          await userRepo.save(notTalked[i]);
          await client.sendMessage(notTalked[i].usernameOrPhone, {
            message: startMessage,
          });
          free--;
          setTimeout(async () => {
            try {
              const updated = await userRepo.findOneBy({
                usernameOrPhone: notTalked[i].usernameOrPhone,
              });
              if (!updated.replied) {
                await client.sendMessage(notTalked[i].usernameOrPhone, {
                  message: startMessage2,
                });
                await openAi.beta.threads.messages.create(updated.threadId, {
                  content: startMessage2,
                  role: "assistant",
                });
              }
            } catch (error) {
              console.error("ERROR SENDING AFTER 30MIN");
            }
          }, 1000 * 60 * 30);
        }
      }
    });

    const appId = +process.env.TG_ID;
    const appHash = process.env.TG_HASH;

    const clients = new Map<string, TelegramClient>();
    for (const bot of bots) {
      try {
        const session = new StringSession(bot.token);
        const client = new TelegramClient(session, appId, appHash, {
          useWSS: true,
        });
        client.floodSleepThreshold = 1;
        await client.start({
          phoneNumber: async () => {
            //@ts-ignore
            return await input.text("number ?");
          },
          phoneCode: async () => {
            //@ts-ignore
            return await input.text("code ?");
          },
          password: async () => {
            //@ts-ignore
            return await input.text("password ?");
          },
          onError: () => {
            console.error("error");
          },
        });
        client.addEventHandler(async (event) => {
          try {
            const dialogs = await client.getDialogs();
            const cl = dialogs.find((el) => {
              return (
                el.entity.className === "User" &&
                el.entity.id.equals(event.message.senderId)
              );
            });
            if (!cl) return;
            const username = cl.entity as Api.User;
            const user = await userRepo.findOne({
              where: {
                usernameOrPhone: username.username,
              },
            });
            if (!user.replied) user.replied = true;
            await userRepo.save(user);
            await wait(7);
            await client.invoke(
              new Api.messages.SetTyping({
                peer: user.usernameOrPhone,
                action: new Api.SendMessageTypingAction(),
              })
            );
            await openAi.beta.threads.messages.create(user.threadId, {
              content: event.message.text,
              role: "user",
            });
            const run = openAi.beta.threads.runs
              .stream(user.threadId, {
                assistant_id: "asst_ygct8xSBgVS3W5tb7on7GJ1y",
              })
              .on("end", async () => {
                const st = run.currentRun();
                if (
                  st.status === "requires_action" &&
                  st.required_action.type === "submit_tool_outputs"
                ) {
                  const calls =
                    st.required_action.submit_tool_outputs.tool_calls;
                  const f = calls[0].function;
                  await manager.sendMessage(
                    -1002244363083,
                    JSON.parse(f.arguments).resume
                  );
                  await openAi.beta.threads.runs.submitToolOutputs(
                    st.thread_id,
                    st.id,
                    {
                      tool_outputs: [
                        {
                          output:
                            "Анкета сохранена. Больше писать юзеру не нужно",
                          tool_call_id: calls[0].id,
                        },
                      ],
                    }
                  );
                  await client.sendMessage(user.usernameOrPhone, {
                    message: "Благодарю. Ждем Вас на мероприятии.",
                  });
                } else {
                  const msgs = await run.finalMessages();
                  for (let msg of msgs) {
                    await client.sendMessage(username, {
                      //@ts-ignore
                      message: msg.content[0].text.value,
                    });
                  }
                }
              });
          } catch (error) {
            console.error("ERROR PROCESSING MESSAGE " + error);
          }
        }, new NewMessage());
        clients.set(bot.token, client);
      } catch (error) {
        console.log("ERROR SETTING UP CLIENT!");
      }

    }
  })
  .catch((error) => console.log(error));
