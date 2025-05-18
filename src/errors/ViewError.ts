export class ViewError extends Error {
  public constructor(message: string) {
    super(`View error: ${message}`);
    this.name = "ViewError";
  }
}
