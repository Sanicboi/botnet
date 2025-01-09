import axios from "axios";
import { openai } from ".";

export class CoinMarketCapAPI {
  constructor(private token: string = process.env.CRYPTO_TOKEN ?? "") {}

  public async getOverallMarketReport(): Promise<string> {
    const r1 = await axios.get(
      "https://pro-api.coinmarketcap.com/v3/fear-and-greed/latest",
      {
        headers: {
          "X-CMC_PRO_API_KEY": this.token,
        },
      },
    );

    const r2 = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Тебе будут данные о Fear and Greed на крипторынке на текущий момент. Проведи детальный анализ того, что это может значить. Будь максимально профессиональным.",
        },
        {
          role: "user",
          content: JSON.stringify(r1.data),
        },
      ],
    });
    return r2.choices[0].message.content!;
  }
}
