import t from "node-telegram-bot-api";

export class BalanceError extends Error {
	constructor() {
		super("Balance or sub error");
	}
}

class QueryBtn implements t.InlineKeyboardButton {
	constructor(
		public text: string,
		public callback_data: string,
	) {}
}

export const Btn = (text: string, callback_data: string): QueryBtn[] => {
	return [new QueryBtn(text, callback_data)];
};
