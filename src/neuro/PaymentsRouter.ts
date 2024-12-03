import TelegramBot from "node-telegram-bot-api";
import { Router } from "./router";
import { bot } from ".";

export class PaymentsRouter extends Router {
  constructor() {
    super();
    this.onQuery = this.onQuery.bind(this);
  }

  public async onQuery(q: TelegramBot.CallbackQuery) {
    if (q.data === "b-sub") {
      await bot.sendMessage(q.from.id, "Выберите тариф подписки", {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Lite (490₽)",
                callback_data: "sub-lite",
              },
            ],
            [
              {
                text: "PRO+ (790₽)",
                callback_data: "sub-pro",
              },
            ],
            [
              {
                text: "Premium (1 490₽)",
                callback_data: "sub-premium",
              },
            ],
            [
              {
                text: "Exclusive (3 490₽)",
                callback_data: "sub-exclusive",
              },
            ],
            [
              {
                text: "Назад",
                callback_data: "back",
              },
            ],
          ],
        },
      });
    }

    if (q.data === "b-tokens") {
      await bot.sendMessage(q.from.id, "Выберите пакет токенов", {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "10к токенов - 99₽",
                callback_data: "tokens-1",
              },
            ],
            [
              {
                text: "30к токенов - 255₽ (15% выгоды)",
                callback_data: "tokens-2",
              },
            ],
            [
              {
                text: "100к токенов - 690₽ (21% выгоды)",
                callback_data: "tokens-3",
              },
            ],
            [
              {
                text: "200к токенов - 1490₽ (26% выгоды)",
                callback_data: "tokens-4",
              },
            ],
            [
              {
                text: "500к токенов - 3525₽ (30% выгоды)",
                callback_data: "tokens-5",
              },
            ],
            [
              {
                text: "1м токенов - 4990₽ (50% выгоды)",
                callback_data: "tokens-6",
              },
            ],
          ],
        },
      });
    }
  }
}
