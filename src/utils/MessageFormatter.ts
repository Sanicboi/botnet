import fs from "fs";
import path from "path";
import { TelegramClient } from "telegram";

export class MessgaeFormatter {
  public static readTextFromFile(file: string): string {
    return fs.readFileSync(path.join(__dirname, "assets", file), "utf8");
  }

  public static async sendTextFromFile(
    user: string,
    file: string,
    client: TelegramClient,
  ) {
    const data = this.readTextFromFile(file);
    await client.sendMessage(user, {
      message: data,
    });
  }
}
