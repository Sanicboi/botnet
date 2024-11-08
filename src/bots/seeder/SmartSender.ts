import { wait } from "../..";
import { Bot } from "../../entity/Bot";
import { Chat } from "../../entity/Chat";
import { Sender } from "./Sender";

export class SmartSender {
  constructor(private sender: Sender) {}

  public async sendSmart(
    chat: Chat,
    bot1: Bot,
    bot2: Bot,
    first: string,
    second: string,
  ) {
    await this.sender.send(bot1, first, chat);
    await wait(3);
    await this.sender.send(bot2, second, chat);
  }
}
