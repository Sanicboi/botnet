import { Bot } from "../Bot";
import { ViewError } from "../errors/ViewError";
import { diskTextStorage } from "../storage";
import { UrlButton } from "./buttons";
import { Keyboard } from "./keyboard";
import { IView } from "./view";

export class AboutView implements IView {
  private readonly _keyboard = new Keyboard([
    new UrlButton(
      "Подробнее о компании",
      "https://drive.google.com/file/d/1oJcInZJShwd-LI4EYlAIBBgRWpEfMHlv/view?usp=drivesdk",
    ),
    new UrlButton("Наш канал", "https://t.me/SmartComrade1"),
    new UrlButton("Бесплатные полезные материалы", "https://t.me/SC_NewsBot"),
  ]);

  public async send(to: number): Promise<void> {
    const file = await diskTextStorage.read("about-neuro.txt");
    if (typeof file.data !== "string")
      throw new ViewError("Could not read text file");
    await Bot.s_Instance.sendText(to, file.data, this._keyboard);
  }
}
