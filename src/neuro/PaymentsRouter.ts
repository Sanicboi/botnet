import TelegramBot from "node-telegram-bot-api";
import { Router } from "./router";
import { bot } from ".";
import { Btn } from "./utils";

/**
 * router that handles everything for the payments
 */
export class PaymentsRouter extends Router {
  /**
   * Creates a new router
   */
  constructor() {
    super();
    this.onQuery = this.onQuery.bind(this);
  }

  /**
   * Handles Callback Queries
   * @param q Callback Query Object
   */
  public async onQuery(q: TelegramBot.CallbackQuery) {
    if (q.data === "b-sub") {
      await bot.sendMessage(q.from.id, "Выберите тариф подписки", {
        reply_markup: {
          inline_keyboard: [
            Btn("Lite (490₽)", "sub-lite"),
            Btn("PRO+ (790₽)", "sub-pro"),
            Btn("Premium (1 490₽)", "sub-premium"),
            Btn("Exclusive (3 490₽)", "sub-exclusive"),
            Btn("Назад", "back"),
          ],
        },
      });
    }

    if (q.data === "b-tokens") {
      await bot.sendMessage(q.from.id, "Выберите пакет токенов", {
        reply_markup: {
          inline_keyboard: [
            Btn("10к токенов - 99₽", "tokens-1"),
            Btn("30к токенов - 255₽ (15% выгоды)", "tokens-2"),
            Btn("100к токенов - 690₽ (21% выгоды)", "tokens-3"),
            Btn("200к токенов - 1490₽ (26% выгоды)", "tokens-4"),
            Btn("500к токенов - 3525₽ (30% выгоды)", "tokens-5"),
            Btn("1м токенов - 4990₽ (50% выгоды)", "tokens-6"),
          ],
        },
      });
    }
  }
}
