import dayjs from 'dayjs';
import { openai } from '.';
import { RestClientV5 } from 'bybit-api';



export class BybitAPI {

    private api: RestClientV5;
    constructor() {
        this.api = new RestClientV5({ 
            key: process.env.BYBIT_KEY,
            secret: process.env.BYBIT_SECRET
        });
    }

    public async getCryptoReport(crypto: string): Promise<string> {
        const res1 = await this.api.getIndexPriceKline({
            category: 'linear',
            symbol: `${crypto}USDT`,
            interval: '1',
            start: dayjs().subtract(7, 'days').unix() * 1000,
            end: dayjs().unix() * 1000
        });

        const res2 = await this.api.getRiskLimit({
            category: 'linear',
            symbol: `${crypto}USDT`
        });

        const res3 = await this.api.getTickers({
            category: 'linear',
            symbol: `${crypto}USDT`
        });

        const analysis1 = await openai.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: 'Ты - профессиональный крипто-аналитик. Проведи анализ данных тебе показателей криптовалюты. Данные в формате JSON массива. В нем каждый элемент - массив (время, open price, highest price, lowest price, close price)'
                },
                {
                    role: 'user',
                    content: JSON.stringify(res1.result.list)
                }
            ],
            model: 'gpt-4o-mini'
        });

        const analysis2 = await openai.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: 'Ты - крипто-аналитик. Проанализируй данные о рисках данной криптовалюты'
                },
                {
                    role: 'user',
                    content: JSON.stringify(res2.result.list)
                }
            ],
            model: 'gpt-4o-mini'
        });

        const analysis3 = await openai.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: 'Ты - крипто-аналитик. Проанализируй данные о тикере.'
                },
                {
                    role: 'user',
                    content: JSON.stringify(res3.result.list)
                }
            ],
            model: 'gpt-4o-mini'
        })

        const analysis = await openai.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: 'Ты - крипто-аналитик. Суммаризируй данные тебе анализы цен криптовалюты, анализ рисков криптовалюты и анализ тикеров. Сделай максимально подробную суммаризацию и выводы.',
                },
                {
                    role: 'user',
                    content: analysis1.choices[0].message.content!
                },
                {
                    role: 'user',
                    content: analysis2.choices[0].message.content!
                },
                {
                    role: 'user',
                    content: analysis3.choices[0].message.content!
                }
            ],
            model: 'gpt-4o-mini'
        })
        return analysis.choices[0].message.content!;
    }
}