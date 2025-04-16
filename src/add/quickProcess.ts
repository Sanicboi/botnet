import fs from "fs";
import path from "path";
import { AppDataSource } from "../data-source";
import { Lead } from "../entity/bots/Lead";

AppDataSource.initialize().then(async () => {
  const users = fs
    .readFileSync(path.join(process.cwd(), "data", "us.txt"), "utf8")
    .split("\n");
  for (const u of users) {
    if (!u) continue;
    const split = u.split("	");
    const user = new Lead();
    user.username = split[0].replace("@", "");
    user.name = split[1];
    user.sphere = split[2];
    await AppDataSource.manager.save(user);
  }
});
