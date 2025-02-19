import axios from "axios";
import {TinkoffInvestApi} from "tinkoff-invest-api";
import { InstrumentIdType } from "tinkoff-invest-api/cjs/generated/instruments";
import { CandleInterval, GetCandlesRequest_CandleSource, LastPriceType } from "tinkoff-invest-api/cjs/generated/marketdata";
import { openai } from ".";
import dayjs from "dayjs";

const api = new TinkoffInvestApi({
    token: process.env.T_INVEST_TOKEN!
})
export class TInvest {


    public static async getAnalysis(ticker: string): Promise<string> {

        const instrument = (await api.instruments.findInstrument({
            query: ticker
        })).instruments[0];
        
        console.log(instrument);
        
        const candles = await api.marketdata.getCandles({
            instrumentId: instrument.uid,
            interval: CandleInterval.CANDLE_INTERVAL_1_MIN,
            ...api.helpers.fromTo("-3d")
        });
        console.log(candles);

        //@ts-ignore
        // const lastPrices = await api.marketdata.getLastPrices({
        //     instrumentId: [
        //         instrument.uid
        //     ],
        //     lastPriceType: LastPriceType.LAST_PRICE_EXCHANGE,
        //     figi: [],
        // });

        const result = await openai.chat.completions.create({
            messages: [
                {
                    role: 'developer',
                    content: 'Ты - инвестор. Твоя задача - проанализировать данные о свечах и последних ценах акции. Сделай максимально подробный отчет.',
                },
                {
                    role: 'user',
                    content: `Свечи: ${JSON.stringify(candles.candles)}`
                }
            ],
            model: 'gpt-4o-mini'
        });

        return result.choices[0].message.content!;
    }
}