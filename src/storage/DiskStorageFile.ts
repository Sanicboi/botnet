import path from "path";
import { IStorageFile } from "./Storage";

export class DiskStorageFile implements IStorageFile {
  protected readonly _id: string;
  protected readonly _extension: string;
  protected readonly _data: string | Buffer;

  public constructor(id: string, data: string) {
    this._id = id;
    this._extension = path.extname(id);
    this._data = data;
  }

  public get id(): string {
    return this._id;
  }

  public get extension(): string {
    return this._extension;
  }

  public get data(): string | Buffer {
    return this._data;
  }
}
