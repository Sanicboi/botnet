import axios from "axios";
import { openai } from ".";

export class CoinMarketCapAPI {
  constructor(private token: string = process.env.CRYPTO_TOKEN ?? "") {}

  public async getOverallMarketReport(): Promise<string> {
    const r1 = axios.get(
      "https://pro-api.coinmarketcap.com/v3/fear-and-greed/latest",
      {
        headers: {
          "X-CMC_PRO_API_KEY": this.token,
        },
      },
    );
    const r2 = axios.get(
      "https://pro-api.coinmarketcap.com/v1/global-metrics/quotes/latest",
      {
        headers: {
          "X-CMC_PRO_API_KEY": this.token,
        },
      },
    );

    const responses = await Promise.all([r1, r2]);

    const digest = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Тебе будут данные о Fear and Greed на крипторынке на текущий момент, а также общее состояние рынка. Проведи детальный анализ со структурой факт-плюсы и минусы-вывод и реккмоендации. Будь максимально профессиональным.",
        },
        {
          role: "user",
          content: JSON.stringify(responses.map((el) => el.data)),
        },
      ],
    });
    return digest.choices[0].message.content!;
  }

  public async getMetadataReport(crypto: string) {
    const response = await axios.get(
      "https://pro-api.coinmarketcap.com/v2/cryptocurrency/info",
      {
        params: {
          symbol: crypto,
        },
        headers: {
          "X-CMC_PRO_API_KEY": this.token,
        },
      },
    );

    return JSON.stringify(response.data);
  }
}
