import TelegramBot from "node-telegram-bot-api";
import { AppDataSource } from "../data-source";
import { AgentGroup } from "../entity/assistants/AgentGroup";
import { Btn } from "./utils";
import { AgentModel } from "../entity/assistants/AgentModel";

let changingName: number | null = null;
let changingPrompt: number | null = null;
let changingFirstMsg: number | null = null;
let changingTemp: number | null = null;
let changingGroupName: number | null = null;
let creatingNewAgent: number | null = null;
let creatingNewGroup: boolean = false;
let whiteList: number[] = [1391491967, 1292900617, 2074310819, 922521019];

const STOP_WORD = "NO";

AppDataSource.initialize()
  .then(async () => {
    const bot = new TelegramBot(process.env.TG_MANAGER_TOKEN!, {
      polling: true,
    });
    const manager = AppDataSource.manager;

    bot.setMyCommands([
      {
        command: "start",
        description: "Запустить бота",
      },
      {
        command: "groups",
        description: "Посмотреть группы агентов",
      },
      {
        command: "reset",
        description: "Сбросить все изменения",
      },
    ]);

    bot.onText(/\/start/, async (msg) => {
      await bot.sendMessage(
        msg.chat.id,
        "Добрый день. Я менеджер SmartComrade",
      );
    });

    bot.onText(/\/groups/, async (msg) => {
      if (!whiteList.includes(msg.from!.id)) return;
      const groups = await manager.find(AgentGroup);
      const keyboard = groups.map((el) => Btn(el.name, `group-${el.id}`));
      keyboard.push(Btn("Новая группа", "new-group"));
      await bot.sendMessage(msg.chat.id, "Выберите группу агентов", {
        reply_markup: {
          inline_keyboard: keyboard,
        },
      });
    });

    bot.onText(/\/reset/, async (msg) => {
      if (!whiteList.includes(msg.from!.id)) return;
      changingName = null;
      changingPrompt = null;
      changingFirstMsg = null;
      changingGroupName = null;
      changingTemp = null;
      creatingNewAgent = null;
      creatingNewGroup = false;
      await bot.sendMessage(msg.chat.id, "Сброс всех изменений");
    });

    bot.on("callback_query", async (q) => {
      if (q.data?.startsWith("group-")) {
        const groupId = q.data.split("-")[1];
        const group = await manager.findOne(AgentGroup, {
          where: { id: +groupId },
          relations: {
            agents: true,
          },
        });
        if (!group) return;
        let keyboard: TelegramBot.InlineKeyboardButton[][] = [];
        keyboard.push(Btn("Добавить агента", `add-agent-${group.id}`));
        group.agents.forEach((el) => {
          keyboard.push(Btn(`Агент: ${el.name}`, `agent-${el.id}`));
        });
        keyboard.push(Btn("Изменить имя группы", `change-group-${group.id}`));
        keyboard.push(Btn("Удалить группу", `delete-group-${group.id}`));
        await bot.sendMessage(
          q.from.id,
          `Группа ${group.id}\nАгенты:\n\n ${group.agents.map((el) => el.name + "\n")}\n\n`,
          {
            reply_markup: {
              inline_keyboard: keyboard,
            },
          },
        );
      }

      if (q.data?.startsWith("agent-")) {
        const agentId = q.data.split("-")[1];
        const agent = await manager.findOne(AgentModel, {
          where: { id: +agentId },
        });
        if (!agent) return;
        await bot.sendMessage(q.from.id, `Агент ${agent.name}\n\n`, {
          reply_markup: {
            inline_keyboard: [
              Btn("Изменить агента", `change-agent-${agent.id}`),
              Btn("Удалить агента", `delete-agent-${agent.id}`),
            ],
          },
        });
      }

      if (q.data?.startsWith("change-agent-")) {
        const agentId = q.data.split("-")[2];
        const agent = await manager.findOne(AgentModel, {
          where: { id: +agentId },
        });
        if (!agent) return;
        changingName = agent.id;
        await bot.sendMessage(
          q.from.id,
          `Введите новое имя агента ${agent.name} или введите "NO", чтобы оставить прежнее`,
        );
      }

      if (q.data?.startsWith("delete-agent-")) {
        const agentId = q.data.split("-")[2];
        const agent = await manager.findOne(AgentModel, {
          where: { id: +agentId },
        });
        if (!agent) return;
        await manager.remove(agent);
        await bot.sendMessage(q.from.id, `Агент ${agent.name} удален`);
      }

      if (q.data?.startsWith("change-group-")) {
        const groupId = q.data.split("-")[2];
        const group = await manager.findOne(AgentGroup, {
          where: { id: +groupId },
        });
        if (!group) return;
        changingGroupName = group.id;
        await bot.sendMessage(
          q.from.id,
          `Введите новое имя группы ${group.name} или введите "NO", чтобы оставить прежнее`,
        );
      }

      if (q.data?.startsWith("delete-group-")) {
        const groupId = q.data.split("-")[2];
        const group = await manager.findOne(AgentGroup, {
          where: { id: +groupId },
        });
        if (!group) return;
        await manager.remove(group);
        await bot.sendMessage(q.from.id, `Группа ${group.name} удалена`);
      }
      if (q.data?.startsWith("add-agent-")) {
        const groupId = q.data.split("-")[2];
        const group = await manager.findOne(AgentGroup, {
          where: { id: +groupId },
        });
        if (!group) return;
        creatingNewAgent = +groupId;
        await bot.sendMessage(q.from.id, `Введите имя нового агента`);
      }

      if (q.data === "new-group") {
        creatingNewGroup = true;
        await bot.sendMessage(q.from.id, `Введите имя новой группы`);
      }
    });

    bot.onText(/./, async (msg) => {
      if (!msg.text?.startsWith("/")) {
        if (changingName) {
          const agent = await manager.findOne(AgentModel, {
            where: { id: changingName },
          });
          if (!agent) return;
          if (msg.text === STOP_WORD) {
            await bot.sendMessage(msg.chat.id, "Имя сохранено");
          } else {
            agent.name = msg.text!;
            await manager.save(agent);
            await bot.sendMessage(msg.chat.id, `Имя изменено`);
          }
          changingName = null;
          changingFirstMsg = agent.id;
          await bot.sendMessage(
            msg.chat.id,
            `Введите новое приветственное сообщение агента ${agent.name} или введите "NO", чтобы оставить прежнее`,
          );
        } else if (changingFirstMsg) {
          const agent = await manager.findOne(AgentModel, {
            where: { id: changingFirstMsg },
          });
          if (!agent) return;
          if (msg.text === STOP_WORD) {
            await bot.sendMessage(
              msg.chat.id,
              "Приветственное сообщение сохранено",
            );
          } else {
            agent.firstMessage = msg.text!;
            await manager.save(agent);
            await bot.sendMessage(msg.chat.id, `Имя изменено`);
          }
          changingFirstMsg = null;
          changingPrompt = agent.id;
          await bot.sendMessage(
            msg.chat.id,
            `Введите новый промт агента ${agent.name} или введите "NO", чтобы оставить прежний`,
          );
        } else if (changingPrompt) {
          const agent = await manager.findOne(AgentModel, {
            where: { id: changingPrompt },
          });
          if (!agent) return;
          if (msg.text === STOP_WORD) {
            await bot.sendMessage(msg.chat.id, "Промт сохранен");
          } else {
            agent.prompt = msg.text!;
            await manager.save(agent);
            await bot.sendMessage(msg.chat.id, `Имя изменено`);
          }
          changingPrompt = null;
          changingTemp = agent.id;
          await bot.sendMessage(
            msg.chat.id,
            `Введите новую температуру агента ${agent.name} или введите "NO", чтобы оставить прежнюю. ТЕМПЕРАТУРА - ЧИСЛО ОТ 0 ДО 2`,
          );
        } else if (changingTemp) {
          const agent = await manager.findOne(AgentModel, {
            where: { id: changingTemp },
          });
          if (!agent) return;
          if (msg.text === STOP_WORD) {
            await bot.sendMessage(msg.chat.id, "Температура сохранена");
          } else {
            const temp = parseFloat(msg.text!);
            if (isNaN(temp) || temp < 0 || temp > 2) {
              await bot.sendMessage(
                msg.chat.id,
                "Температура должна быть числом от 0 до 2",
              );
            } else {
              agent.temperature = temp;
              await manager.save(agent);
              await bot.sendMessage(msg.chat.id, `Температура изменена`);
            }
          }
          changingTemp = null;
          await bot.sendMessage(msg.chat.id, `Изменение агента завершено`);
        } else if (changingGroupName) {
          const group = await manager.findOne(AgentGroup, {
            where: { id: changingGroupName },
          });
          if (!group) return;
          if (msg.text === STOP_WORD) {
            await bot.sendMessage(msg.chat.id, "Имя группы сохранено");
          } else {
            group.name = msg.text!;
            await manager.save(group);
            await bot.sendMessage(msg.chat.id, `Имя изменено`);
          }
          changingGroupName = null;
          await bot.sendMessage(msg.chat.id, `Изменение группы завершено`);
        } else if (creatingNewAgent) {
          const agent = new AgentModel();
          agent.name = msg.text!;
          agent.groupId = creatingNewAgent;
          agent.group = new AgentGroup();
          agent.group.id = creatingNewAgent;
          await manager.save(agent);
          creatingNewAgent = null;

          await bot.sendMessage(
            msg.chat.id,
            `Агент ${agent.name} создан. Теперь измените его данные`,
            {
              reply_markup: {
                inline_keyboard: [
                  Btn("Изменить агента", `change-agent-${agent.id}`),
                  Btn("Удалить агента", `delete-agent-${agent.id}`),
                ],
              },
            },
          );
        } else if (creatingNewGroup) {
          creatingNewGroup = false;
          const group = new AgentGroup();
          group.name = msg.text!;
          await manager.save(group);
          await bot.sendMessage(msg.chat.id, `Группа ${group.name} создана`, {
            reply_markup: {
              inline_keyboard: [
                Btn("Изменить группу", `change-group-${group.id}`),
                Btn("Удалить группу", `delete-group-${group.id}`),
              ],
            },
          });
        }
      }
    });
  })
  .catch((error) => console.log(error));
