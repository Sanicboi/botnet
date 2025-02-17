import axios from "axios";

export class TInvest {


    public static async getAnalysis(ticker: string): Promise<string> {
        const res = await axios.get(`http://invest:6667/api/active/${ticker}`);
        return res.data;
    }
}