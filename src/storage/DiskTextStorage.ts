import { DiskStorage } from "./DiskStorage";

export class DiskTextStorage extends DiskStorage {
  public constructor(basePath: string) {
    super(basePath, "utf-8");
  }
}
