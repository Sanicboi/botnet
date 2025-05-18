export interface IStorageFile {
  id: string;
  extension: string;
  data: string | Buffer;
}

export interface IStorage {
  read(id: string): Promise<IStorageFile>;
  write(file: IStorageFile): Promise<void>;
  getAll(): Promise<string[]>;
  delete(id: string): Promise<void>;
  append(file: IStorageFile): Promise<void>;
}
