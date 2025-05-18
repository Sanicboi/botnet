import { Bot } from "../Bot";
import { QueryButton } from "./buttons";
import { Keyboard } from "./keyboard";
import { IView } from "./view";

export class SettingsView implements IView {
  private readonly _text: string = "Настройки ⚙️";
  private readonly _keyboard: Keyboard = new Keyboard([
    new QueryButton("Изменить модель", "settings.model"),
    new QueryButton("Подсчет токенов", "settings.count"),
    new QueryButton("Формат ответа", "settings.format"),
  ]);

  public async send(to: number): Promise<void> {
    await Bot.s_Instance.sendText(to, this._text, this._keyboard);
  }
}
