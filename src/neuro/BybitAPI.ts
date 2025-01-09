import bybit from 'bybit-api';
import dayjs from 'dayjs';
import { openai } from '.';



export class BybitAPI {

    private api: bybit.RestClientV5;
    constructor() {
        this.api = new bybit.RestClientV5({ 
            key: process.env.BYBIT_KEY,
            secret: process.env.BYBIT_SECRET
        });
    }

    public async getCryptoReport(crypto: string): Promise<string> {
        const res = await this.api.getIndexPriceKline({
            category: 'linear',
            symbol: `${crypto}USDT`,
            interval: '1',
            start: dayjs().subtract(7, 'days').unix() * 1000,
            end: dayjs().unix() * 1000
        });

        const analysis = await openai.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: 'Ты - профессиональный крипто-аналитик. Проведи анализ данных тебе показателей криптовалюты. Данные в формате JSON массива. В нем каждый элемент - массив (время, open price, highest price, lowest price, close price)'
                },
                {
                    role: 'user',
                    content: JSON.stringify(res.result.list)
                }
            ],
            model: 'gpt-4o-mini'
        });
        return analysis.choices[0].message.content!;
    }
}