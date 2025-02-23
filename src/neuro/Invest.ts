import axios from "axios";
import { openai } from ".";
import dayjs from "dayjs";

export class Invest {


    public static async getAnalysis(ticker: string): Promise<string> {

        
        
        const results = await axios.get('https://api.marketstack.com/v2/eod', {
            params: {
                'access_key': process.env.INVEST_TOKEN,
                symbols: ticker,
                'date_to': dayjs().format('YYYY-MM-DD'),
                'date_from': dayjs().subtract(1, 'month').format('YYYY-MM-DD'),
            }
        });

        const result = await openai.chat.completions.create({
            messages: [
                {
                    role: 'developer',
                    content: 'Ты - инвестор. Твоя задача - проанализировать данные о акции. Сделай максимально подробный отчет.',
                },
                {
                    role: 'user',
                    content: `Последние цены: ${JSON.stringify(results.data)}`
                }
            ],
            model: 'gpt-4o-mini'
        });

        return result.choices[0].message.content!;
    }
}