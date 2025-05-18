export class EnvError extends Error {
  constructor(variable: string) {
    super(`ENV variable ${variable} not set`);
    this.name = "EnvError";
  }
}
