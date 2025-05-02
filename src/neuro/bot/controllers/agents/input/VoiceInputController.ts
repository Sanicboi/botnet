import { Bot } from "../../../../Bot";
import { IController } from "../../../Controller";

export class VoiceInputController implements IController {
  constructor(private bot: Bot) {}

  public bind() {}
}
