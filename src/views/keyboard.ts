import type { InlineKeyboardButton } from "node-telegram-bot-api";
import { IButton } from "./buttons";

export class Keyboard {
  private readonly _buttons: IButton[];

  public constructor(buttons: IButton[]) {
    this._buttons = buttons;
  }

  public render(): InlineKeyboardButton[][] {
    return this._buttons.map<InlineKeyboardButton[]>((el) => el.render());
  }
}
