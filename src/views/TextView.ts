import { Bot } from "../Bot";
import { IView } from "./view";

export class TextView implements IView {
  protected readonly _text: string;

  public constructor(text: string) {
    this._text = text;
  }

  public async send(to: number): Promise<void> {
    Bot.s_Instance.sendText(to, this._text);
  }
}
