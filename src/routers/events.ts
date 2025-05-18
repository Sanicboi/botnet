export type AttachmentType = "voice" | "audio" | "file" | "image";
export type EventType = "command" | "message" | "query" | AttachmentType;

export class TelegramEvent {
  protected readonly _from: number;
  protected readonly _messageId: number;
  protected readonly _type: EventType;

  public constructor(from: number, messageId: number, type: EventType) {
    this._from = from;
    this._messageId = messageId;
    this._type = type;
  }

  public get from(): number {
    return this._from;
  }

  public get type(): EventType {
    return this._type;
  }

  public get messageId(): number {
    return this._messageId;
  }
}

export class CommandEvent extends TelegramEvent {
  private readonly _name: string;

  public get name(): string {
    return this.name;
  }

  public constructor(name: string, from: number, messageId: number) {
    super(from, messageId, "command");
  }
}

export class MessageEvent extends TelegramEvent {
  private readonly _text: string;

  public get text(): string {
    return this._text;
  }

  public constructor(from: number, text: string, messageId: number) {
    super(from, messageId, "message");
    this._text = text;
  }
}

export class QueryEvent extends TelegramEvent {
  private readonly _data: string;
  private readonly _split: string[];

  public get data(): string {
    return this._data;
  }

  public get split(): string[] {
    return this._split;
  }

  public constructor(from: number, data: string, messageId: number) {
    super(from, messageId, "query");
    this._data = data;
    this._split = data.split(".");
  }
}

export class AttachmentEvent extends TelegramEvent {
  private readonly _url: string;
  private readonly _caption: string | null;

  public get url(): string {
    return this._url;
  }

  public get caption(): string | null {
    return this._caption;
  }

  public constructor(
    from: number,
    messageId: number,
    type: AttachmentType,
    url: string,
    caption: string | null = null,
  ) {
    super(from, messageId, type);
    this._url = url;
    this._caption = caption;
  }
}
