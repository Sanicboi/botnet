import dayjs from "dayjs";
import { openai } from ".";
import {
  APIResponseV3WithTime,
  CategoryListV5,
  CategorySymbolListV5,
  OHLCKlineV5,
  RestClientV5,
  RiskLimitV5,
  TickerLinearInverseV5,
} from "bybit-api";
import { ChatCompletion } from "openai/resources";

export class BybitAPI {
  private api: RestClientV5;
  constructor() {
    this.api = new RestClientV5({
      key: process.env.BYBIT_KEY,
      secret: process.env.BYBIT_SECRET,
    });
  }

  public async getCryptoReport(crypto: string): Promise<string> {
    const results: [
      APIResponseV3WithTime<
        CategorySymbolListV5<OHLCKlineV5[], "linear" | "inverse">
      >,
      APIResponseV3WithTime<
        CategoryListV5<RiskLimitV5[], "inverse" | "linear">
      >,
      APIResponseV3WithTime<
        CategoryListV5<TickerLinearInverseV5[], "linear" | "inverse">
      >,
    ] = await Promise.all([
      this.api.getIndexPriceKline({
        category: "linear",
        symbol: `${crypto}USDT`,
        interval: "1",
        start: dayjs().subtract(7, "days").unix() * 1000,
        end: dayjs().unix() * 1000,
      }),
      this.api.getRiskLimit({
        category: "linear",
        symbol: `${crypto}USDT`,
      }),
      this.api.getTickers({
        category: "linear",
        symbol: `${crypto}USDT`,
      }),
    ]);

    return `Показатели криптовалюты (В нем каждый элемент - массив (время, open price, highest price, lowest price, close price)): ${JSON.stringify(results[0].result.list)}\nДанные о рисках: ${JSON.stringify(results[1].result.list)}\nДополнительные данные о тикере: ${JSON.stringify(results[2].result.list)}`;
  }
}
