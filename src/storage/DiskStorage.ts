import { IStorage, IStorageFile } from "./Storage";
import fs from "fs/promises";
import path, { join } from "path";
import { DiskStorageFile } from "./DiskStorageFile";
import { StorageError } from "../errors/StorageError";

export class DiskStorage implements IStorage {
  protected readonly _basePath: string;
  protected readonly _encoding: BufferEncoding;

  public constructor(basePath: string, encoding: BufferEncoding) {
    this._basePath = path.join(process.cwd(), basePath);
    this._encoding = encoding;
  }

  public async read(id: string): Promise<IStorageFile> {
    try {
      const data: string | Buffer = await fs.readFile(
        path.join(this._basePath, id),
        this._encoding,
      );
      return new DiskStorageFile(id, data);
    } catch (e) {
      if (e instanceof Error) {
        console.error(`Error ${e.name} reading File ${id}`);
        throw new StorageError("Read error");
      }

      throw new Error("Unknown error");
    }
  }

  public async delete(id: string): Promise<void> {
    try {
      await fs.rm(path.join(this._basePath, id));
    } catch (e) {
      if (e instanceof Error) {
        console.error(`Error ${e.name} deleting File ${id}`);
        throw new StorageError("Delete Error");
      }

      throw new Error("Unknown error");
    }
  }

  public async getAll(): Promise<string[]> {
    try {
      const contents = await fs.readdir(this._basePath, {
        withFileTypes: true,
      });
      const result: string[] = [];
      for (const c of contents) {
        if (c.isFile()) {
          result.push(path.basename(c.name));
        }
      }
      return result;
    } catch (e) {
      if (e instanceof Error) {
        console.error(`Error ${e.name} getting all files`);
        throw new StorageError("Get All error");
      }

      throw new Error("Unknown error");
    }
  }

  public async write(file: IStorageFile): Promise<void> {
    try {
      await fs.writeFile(
        path.join(this._basePath, file.id),
        file.data,
        this._encoding,
      );
    } catch (e) {
      if (e instanceof Error) {
        console.error(`Error ${e.name} writing to file ${file.id}`);
        throw new StorageError("Write error");
      }
      throw new Error("Unknown error");
    }
  }

  public async append(file: IStorageFile): Promise<void> {
    try {
      await fs.appendFile(
        path.join(this._basePath, file.id),
        file.data,
        this._encoding,
      );
    } catch (e) {
      if (e instanceof Error) {
        console.error(`Error ${e.name} appending file ${file.id}`);
        throw new StorageError("Append error");
      }
      throw new Error("Unknown error");
    }
  }
}
