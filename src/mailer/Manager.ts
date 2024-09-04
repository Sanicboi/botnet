import TelegramBot, { Message } from "node-telegram-bot-api";

export class Manager {
  private bot: TelegramBot;

  constructor() {
    this.reportToMe = this.reportToMe.bind(this);
    this.reportToLogs = this.reportToLogs.bind(this);
    this.reportToAnquets = this.reportToAnquets.bind(this);
    this.bot = new TelegramBot(process.env.MAILER_TG_TOKEN ?? "", {
      polling: true,
    });
  }

  public async reportToMe(text: string) {
    await this.bot.sendMessage(2074310819, text);
  }

  public async reportToLogs(text: string) {
    await this.bot.sendMessage(-1002201795929, text);
  }

  public async reportToAnquets(text: string) {
    await this.bot.sendMessage(-1002244363083, text);
  }

  public onText(r: RegExp, cb: (msg: Message) => Promise<any>) {
    return this.bot.onText(r, cb);
  }
}
