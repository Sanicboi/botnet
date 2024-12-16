import t from "node-telegram-bot-api";

/**
 * This class should be used in the future to process balance errors
 */
export class BalanceError extends Error {
  constructor() {
    super("Balance or sub error");
  }
}

/**
 * This class is an internal helper class for Callback Query Buttons
 */
class QueryBtn implements t.InlineKeyboardButton {
  constructor(
    public text: string,
    public callback_data: string,
  ) {}
}

/**
 * This function is a helper function used to create a new QueryBtn in an array,
 * basically creating a new button in a row
 * @param text Button text
 * @param callback_data Button callback data
 * @returns Button row array
 */
export const Btn = (text: string, callback_data: string): QueryBtn[] => {
  return [new QueryBtn(text, callback_data)];
};
