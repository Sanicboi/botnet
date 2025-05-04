import { Message } from "node-telegram-bot-api";
import { User } from "../../../../../entity/User";
import { Bot } from "../../../../Bot";
import { IController } from "../../../Controller";
import { BalanceController } from "../../balance/BalanceController";
import { OutputController } from "../output/OutputController";
import { TranscriptionController } from "../TranscriptionController";
import { api } from "../../../../apis/API";
import { Converter } from "../../balance/Converter";

export class VoiceInputController implements IController {
  constructor(
    private bot: Bot,
    private balanceController: BalanceController,
    private outputController: OutputController,
    private transcriptionController: TranscriptionController,
  ) {}

  public bind() {
    this.bot.bot.on("voice", async (msg) => {
      const user = await this.bot.getUser(msg, {
        conversations: true,
        model: true,
      });

      if (!user.currentAudioAgent) {
        await this.onVoiceInput(user, msg);
      }
    });
  }

  private async onVoiceInput(user: User, msg: Message) {
    const limit = await this.balanceController.getLimit(user);
    if (!limit) return;

    const conv = user.conversations.find((el) => el.active);
    if (!conv) return;

    const text = await this.transcriptionController.getVoiceInput(msg);

    const result = await api.run({
      api: user.model.api,
      input: text + "\n\nДополнительные данные: " + user.dialogueData,
      model: user.model.id,
      type: "text",
      conversation: conv,
      user,
      store: true,
      instructions: user.agent!.prompt,
      maxTokens: limit,
    });

    await this.balanceController.subtractCost(
      Converter.TKRUB(result.tokens, user.model),
      user,
    );

    await this.outputController.sendOutput(
      result.content,
      user,
      conv,
      result.tokens,
    );
  }
}
