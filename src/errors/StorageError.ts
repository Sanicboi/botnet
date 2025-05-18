export class StorageError extends Error {
  constructor(message: string) {
    super(`Storage error: ${message}`);
    this.name = "StorageError";
  }
}
