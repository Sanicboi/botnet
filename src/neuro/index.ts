import OpenAI from "openai";
import { AppDataSource } from "../data-source";
import { Bot } from "./Bot";
import { IController } from "./bot/Controller";
import { AgentController } from "./bot/controllers/agents/AgentController";
import { BalanceController } from "./bot/controllers/balance/BalanceController";
import { StaticController } from "./bot/controllers/static/StaticController";
import { PromoController } from "./bot/controllers/PromoController";
import { ReferralController } from "./bot/controllers/ReferralController";
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
});

AppDataSource.initialize().then(async () => {
  const bot = new Bot();

  
  let controllers: IController[] = [
    new AgentController(bot),
    new BalanceController(bot),
    new StaticController(bot),
    new PromoController(bot),
    new ReferralController(bot)
  ];

  for (const controller of controllers) {
    controller.bind();
  }
});
