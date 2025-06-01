

export class UnimplementedError extends Error {
    constructor() {
        super("Not implemented");
        this.name = "UnimplementedError";
    }
}