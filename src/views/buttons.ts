import type { InlineKeyboardButton } from "node-telegram-bot-api";
import { ViewError } from "../errors/ViewError";

export interface IButton {
  render(): InlineKeyboardButton[];
}

abstract class Button implements IButton {
  protected readonly _text: string;

  public constructor(text: string) {
    this._text = text;
  }

  abstract render(): InlineKeyboardButton[];
}

export class UrlButton extends Button {
  private readonly _url: string;

  public constructor(text: string, url: string) {
    super(text);
    this._url = url;
  }

  public render(): InlineKeyboardButton[] {
    return [
      {
        text: this._text,
        url: this._url,
      },
    ];
  }
}

export class QueryButton extends Button {
  private readonly _data: string;

  public constructor(text: string, data: string) {
    super(text);
    this._data = data;
  }

  public render(): InlineKeyboardButton[] {
    return [
      {
        text: this._text,
        callback_data: this._data,
      },
    ];
  }
}
