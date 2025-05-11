import OpenAI from "openai";
import { AppDataSource } from "../data-source";
import { Bot } from "./Bot";
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
});

AppDataSource.initialize().then(async () => {
  const bot = new Bot();
});
