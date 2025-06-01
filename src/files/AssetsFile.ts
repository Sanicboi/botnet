import path from "path";
import { FileError } from "../errors/FileError";
import { ILocalFile } from "./ILocalFile";
import fs from 'fs/promises';
import { LocalDirectoryFile } from "./LocalDirectoryFile";

export class AssetsFile extends LocalDirectoryFile {
    public source(): "assets" {
        return 'assets';
    }

    public path(): string {
        return path.join(process.cwd(), 'assets', this.basename());
    }
}