import { Bot } from "../../Bot";
import { ViewError } from "../../errors/ViewError";
import { diskTextStorage } from "../../storage";
import { IView } from "../view";

export class TermsView implements IView {
  public async send(to: number): Promise<void> {
    const text = await diskTextStorage.read("terms.txt");
    if (typeof text !== "string")
      throw new ViewError("Could not read text file");

    await Bot.s_Instance.sendText(to, text, null, "Markdown");
  }
}
