import { AppDataSource } from "../../data-source";
import { User } from "../../entity/User";
import { Btn } from "../../neuro/utils";
import { BalanceController } from "../BalanceController";
import { Bot } from "../Bot";
import { Converter } from "../Converter";
import { OutputController } from "../OutputController";
import { Transcription } from "../Transcription";

const manager = AppDataSource.manager;

export class AudioAgent {
  constructor(
    private bot: Bot,
    private outputController: OutputController,
    private balanceController: BalanceController,
  ) {
    bot.onTranscribeSaved(this.transcribeSaved.bind(this));
    bot.onTranscribeSaved(this.transcribeSaved.bind(this));
    bot.onCalculateCosts(this.calculateCosts.bind(this));
  }

  private async calculateCosts(user: User, url: string) {
    const transcription = new Transcription(false, url);
    await transcription.setup();
    const costs = await transcription.getCost();
    const checkResult = await this.balanceController.checkBalance(user);
    if (!checkResult.exists) return;
    const results = await transcription.save(user);
    await this.bot.bot.sendMessage(
      +user.chatId,
      `Транскрибация будет стоить ${costs} токенов. Хотите продолжить?`,
      {
        reply_markup: {
          inline_keyboard: [
            Btn("Да", `transcription-${results.id}`),
            Btn("Нет", "transcription-no"),
          ],
        },
      },
    );
  }

  private async transcribeSaved(user: User, id: string) {
    const transcription = new Transcription(true, id);
    await transcription.setup();
    const result = await transcription.transcribe();
    const costs = await transcription.getCost();
    await this.balanceController.editBalance(
      user,
      Converter.SMTTK(costs, user.model),
    );
    const converted = await this.outputController.convert(
      result,
      user.outputFormat,
    );
    await this.outputController.send(converted, user);
    await transcription.remove();
  }

  private async transcribeNonSaved(user: User, url: string) {
    const transcription = new Transcription(false, url);
    await transcription.setup();
    const result = await transcription.transcribe();
    const converted = await this.outputController.convert(
      result,
      user.outputFormat,
    );
    await this.outputController.send(converted, user);
  }
}
