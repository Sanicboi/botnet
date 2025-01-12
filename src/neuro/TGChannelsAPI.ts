import { Api, TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { openai } from ".";

export class TGChannelsAnalyzer {
  private client: TelegramClient;
  constructor() {
    const session = new StringSession(process.env.TG_ANALYZER_TOKEN);
    this.client = new TelegramClient(
      session,
      Number(process.env.TG_API_ID!),
      process.env.TG_API_HASH!,
      {
        useWSS: true,
      },
    );
    this.client.start({
      async onError(err) {
        console.log(err);
        return true;
      },
      phoneNumber: "88005553535",
      phoneCode: async () => "1234",
    });
  }

  public async searchByWordCryptoReport(crypto: string): Promise<string> {
    const dialogs = await this.client.getDialogs();
    const channels = dialogs.filter((el) => {
      return el.isChannel;
    });
    let all: Api.Message[] = [];
    for (const channel of channels) {
      const msgs = await this.client.getMessages(channel.id, {
        search: crypto,
      });
      all.push(...msgs);
    }
    const edited = all.map((el) => el.text).slice(0, 10);
    const res = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `Ты - крипто-аналитик. Проанализируй криптовалюту ${crypto} на основе постов из телеграмм.`,
        },
        {
          role: "user",
          content: JSON.stringify(edited),
        },
      ],
      model: "gpt-4o-mini",
    });
    return res.choices[0].message.content!;
  }
}
