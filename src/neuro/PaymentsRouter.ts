import TelegramBot from "node-telegram-bot-api";
import { Router } from "./router";
import { bot } from ".";
import { Btn } from "./utils";
import { ICreatePayment, YooCheckout } from "@a2seven/yoo-checkout";
import { User } from "../entity/User";

const checkout = new YooCheckout({
  secretKey: process.env.YOOKASSA_KEY ?? '',
  shopId: process.env.YOOKASSA_SHOP_ID ?? ''
});


const tokenPacksMap = new Map<string, number>();
tokenPacksMap.set('1', 99);
tokenPacksMap.set('2', 255);
tokenPacksMap.set('3', 690);
tokenPacksMap.set('4', 1490);
tokenPacksMap.set('5', 3525);
tokenPacksMap.set('6', 4990);

const tokenPacksReverse = new Map<number, number>();
tokenPacksReverse.set(99, 3.4);
tokenPacksReverse.set(255, 10.2);
tokenPacksReverse.set(690, 34);
tokenPacksReverse.set(1490, 68);
tokenPacksReverse.set(3525, 170);
tokenPacksReverse.set(4990, 340);

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
      await bot.sendMessage(q.from.id, "👇Выберите условия подписки:", {
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
      await bot.sendMessage(q.from.id, "👇Выберите комплект токенов:", {
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

    if (q.data?.startsWith("tokens-")) {
      const t = q.data.substring(7);
      const n = tokenPacksMap.get(t);
      if (n) {
        const paymentInfo: ICreatePayment = {
          amount: {
            currency: "RUB",
            value: `${n}.00`
          },
          capture: true,
          confirmation: {
            type: "redirect",
            return_url: "https://t.me/NComrades_bot"
          },
          description: `Оплата пакета токенов: ${n} токенов`,
          merchant_customer_id: String(q.from.id)
        };

        const res = await checkout.createPayment(paymentInfo);
        await bot.sendMessage(q.from.id, "Пожалуйста, оплатите счет. После оплаты нажмите \"Я оплатил\"", {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: 'Оплатить',
                  url: res.confirmation.confirmation_url
                }
              ],
              Btn('Я оплатил', `ihavepaid-tokens-${res.id}`)
            ]
          }
        })
      }
    }

    if (q.data?.startsWith("ihavepaid-")) {
      if (q.data.startsWith("ihavepaid-tokens-")) {
        const paymentId = q.data.substring(17);
        try {
          const res = await checkout.getPayment(paymentId);
          if (res.status === "succeeded") {
            if (res.merchant_customer_id === String(q.from.id)) {
              const u = await Router.manager.findOneBy(User, {
                chatId: res.merchant_customer_id
              });
              if (u) {
                const amount = parseInt(res.amount.value);
                const tokens = tokenPacksReverse.get(amount);
                if (tokens) {
                  u.addBalance += amount;
                  await Router.manager.save(u);
                  await bot.sendMessage(q.from.id, "Платеж прошел успешно! Можете вернуться в меню");
                  await bot.deleteMessage(q.from.id, q.message!.message_id);
                }
              }

            }            
          }
        } catch (error) {
          console.log(error);
          await bot.sendMessage(q.from!.id, "Платеж не найден. Попробуйте еще раз или обратитесь в поддержку.")
        }        
      }
    }
  }
}
