export class TelegramFile {
  private readonly _name: string;
  private readonly _source: string | Buffer;
  private readonly _caption: string | null;

  constructor(
    name: string,
    source: string | Buffer,
    caption: string | null = null,
  ) {
    this._caption = caption;
    this._source = source;
  }

  public get name(): string {
    return this._name;
  }

  public get source(): string | Buffer {
    return this._source;
  }

  public get caption(): string | null {
    return this._caption;
  }
}
