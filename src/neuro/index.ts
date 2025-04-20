import OpenAI from "openai";
import { AppDataSource } from "../data-source";
import { AgentController } from "./AgentController";
import { BalanceController } from "./BalanceController";
import { Bot } from "./Bot";
import { DataController } from "./DataController";
import { DialogController } from "./DialogController";
import { OutputController } from "./OutputController";
import { PromoController } from "./PromoController";
import { RefController } from "./RefController";
import { SettingsController } from "./SettingsController";
import { StaticController } from "./StaticController";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
});

AppDataSource.initialize().then(async () => {
  const bot = new Bot();

  const balanceController = new BalanceController(bot);
  const outputController = new OutputController(bot);
  const promoController = new PromoController(bot);
  const staticController = new StaticController(bot);
  const refController = new RefController(bot);
  const dataController = new DataController(bot);
  const dialogController = new DialogController(bot, dataController);
  const settingsController = new SettingsController(bot);
  const agentController = new AgentController(
    bot,
    balanceController,
    dialogController,
    outputController,
    dataController
  );

  bot.setListeners();
});
