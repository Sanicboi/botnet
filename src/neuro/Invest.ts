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
                'date_from': dayjs().subtract(1, 'week').format('YYYY-MM-DD'),
            }
        });

        return JSON.stringify(results.data);
    }
}