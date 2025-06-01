export class FileError extends Error {
    constructor(message: string) {
        super(`File error: ${message}`);
        this.name = "FileError";
    }
}