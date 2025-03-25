import TelegramBot from "node-telegram-bot-api";
import { Router } from "./router";
import { bot } from ".";
import { Btn } from "./utils";
import { ICreatePayment, YooCheckout } from "@a2seven/yoo-checkout";
import { User } from "../entity/User";
import cron from "node-cron";
import dayjs from "dayjs";

const checkout = new YooCheckout({
  secretKey: process.env.YOOKASSA_KEY ?? "",
  shopId: process.env.YOOKASSA_SHOP_ID ?? "",
});

const subMap = new Map<string, number>();
subMap.set("lite", 490);
subMap.set("pro", 790);
subMap.set("premium", 1490);
subMap.set("exclusive", 3490);

const tokenPacksMap = new Map<string, number>();
tokenPacksMap.set("1", 99);
tokenPacksMap.set("2", 255);
tokenPacksMap.set("3", 690);
tokenPacksMap.set("4", 1490);
tokenPacksMap.set("5", 3525);
tokenPacksMap.set("6", 4990);

const tokenPacksReverse = new Map<number, number>();
tokenPacksReverse.set(99, 3.4);
tokenPacksReverse.set(255, 10.2);
tokenPacksReverse.set(690, 34);
tokenPacksReverse.set(1490, 68);
tokenPacksReverse.set(3525, 170);
tokenPacksReverse.set(4990, 340);

const subsMap = new Map<string, number>();
subsMap.set("none", 0);
subsMap.set("lite", 1.7);
subsMap.set("pro", 10);
subsMap.set("premium", 15);
subsMap.set("exclusive", 45);

const subMapReverse = new Map<
  number,
  "none" | "lite" | "pro" | "premium" | "exclusive"
>();
subMapReverse.set(0, "none");
subMapReverse.set(490, "lite");
subMapReverse.set(790, "pro");
subMapReverse.set(1490, "premium");
subMapReverse.set(3490, "exclusive");

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
    cron.schedule("0 0 * * *", this.onCron.bind(this));
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
            Btn("Lite |5.000 токенов/день| (490₽/мес)", "sub-lite"),
            Btn("Pro+ |30.000 токенов/день| (790₽/мес)", "sub-pro"),
            Btn("Premium |45.000 токенов/день| (1490₽/мес)", "sub-premium"),
            Btn("Exclusive |135.000 токенов/день| (3490₽/мес)", "sub-exclusive"),
            Btn("Назад", "balance"),
          ],
        },
      });
    }

    if (q.data === "b-tokens") {
      await bot.sendMessage(q.from.id, "👇Выберите комплект токенов:", {
        reply_markup: {
          inline_keyboard: [
            Btn("10.000 токенов - 99₽", "tokens-1"),
            Btn("30.000 токенов - 255₽ (15% выгоды)", "tokens-2"),
            Btn("100.000 токенов - 690₽ (21% выгоды)", "tokens-3"),
            Btn("200.000 токенов - 1490₽ (26% выгоды)", "tokens-4"),
            Btn("500.000 токенов - 3525₽ (30% выгоды)", "tokens-5"),
            Btn("1.000.000 токенов - 4990₽ (50% выгоды)", "tokens-6"),
            Btn('Назад', 'balance')
          ],
        },
      });
    }

    if (q.data?.startsWith("sub-")) {
      const t = q.data.substring(4);
      const n = subMap.get(t);
    }

    if (q.data?.startsWith("tokens-")) {
      const t = q.data.substring(7);
      const n = tokenPacksMap.get(t);
      if (n) {
        const paymentInfo: ICreatePayment = {
          amount: {
            currency: "RUB",
            value: `${n}.00`,
          },
          capture: true,
          confirmation: {
            type: "redirect",
            return_url: "https://t.me/NComrades_bot",
          },
          description: `Оплата пакета токенов: ${n} токенов`,
          merchant_customer_id: String(q.from.id),
        };

        const res = await checkout.createPayment(paymentInfo);
        await bot.sendMessage(
          q.from.id,
          'Пожалуйста, оплатите счет. После оплаты нажмите "Я оплатил"',
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "Оплатить",
                    url: res.confirmation.confirmation_url,
                  },
                ],
                Btn("Я оплатил", `ihavepaid-tokens-${res.id}`),
              ],
            },
          },
        );
      }
    }

    if (q.data?.startsWith("sub-")) {
      const t = q.data.split("-")[1];
      const n = subMap.get(t);
      if (!n) return;
      const info: ICreatePayment = {
        amount: {
          currency: "RUB",
          value: `${n}.00`,
        },
        capture: true,
        confirmation: {
          type: "redirect",
          return_url: "https://t.me/NComrades_bot",
        },
        description: `Оплата подписки`,
        merchant_customer_id: String(q.from.id),
        save_payment_method: true,
      };
      const payment = await checkout.createPayment(info);
      await bot.sendMessage(
        q.from.id,
        'Пожалуйста, оплатите счет. После оплаты нажмите "Я оплатил"',
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Оплатить",
                  url: payment.confirmation.confirmation_url,
                },
              ],
              Btn("Я оплатил", `ihavepaid-sub-${payment.id}`),
            ],
          },
        },
      );
    }

    if (q.data?.startsWith("ihavepaid-")) {
      if (q.data.startsWith("ihavepaid-tokens-")) {
        const paymentId = q.data.substring(17);
        try {
          const res = await checkout.getPayment(paymentId);
          if (res.status === "succeeded") {
            if (res.merchant_customer_id === String(q.from.id)) {
              const u = await Router.manager.findOneBy(User, {
                chatId: res.merchant_customer_id,
              });
              if (u) {
                const amount = parseInt(res.amount.value);
                const tokens = tokenPacksReverse.get(amount);
                if (tokens) {
                  u.addBalance += tokenPacksReverse.get(amount)!;
                  await Router.manager.save(u);
                  await bot.sendMessage(
                    q.from.id,
                    "Оплата успешно прошла 🚀\nБаланс токенов пополнен, подробнее: /balance\nПриятного пользования😉",
                  );
                }
              }
            }
          }
        } catch (error) {
          console.log(error);
          await bot.sendMessage(
            q.from!.id,
            "Платеж не найден. Попробуйте еще раз или обратитесь в поддержку.",
          );
        }
      }

      if (q.data.startsWith("ihavepaid-sub-")) {
        const paymentId = q.data.substring(14);
        try {
          const res = await checkout.getPayment(paymentId);
          if (
            res.status === "succeeded" &&
            res.merchant_customer_id === String(q.from.id)
          ) {
            const u = await Router.manager.findOneBy(User, {
              chatId: res.merchant_customer_id,
            });
            if (!u) return;
            if (res.payment_method.saved) {
              u.paymentMethod = res.payment_method.id;
            }
            u.nextPayment = dayjs().add(30, "days").toDate();
            u.subscription =
              subMapReverse.get(parseInt(res.amount.value)) ?? "none";
            u.leftForToday = subsMap.get(u.subscription) ?? 0;
            await Router.manager.save(u);
            await bot.sendMessage(+u.chatId, "Оплата успешно прошла 🚀\nПодписка обновлена, подробнее: /balance\nПриятного пользования😉")
          }
        } catch (error) {}
      }
    }
  }

  private async onCron() {
    const users = await Router.manager
      .createQueryBuilder()
      .select()
      .from(User, "user")
      .where("user.subscription <> :s", {
        s: "none",
      })
      .getMany();

    for (const user of users) {
      if (user.nextPayment && user.nextPayment <= new Date()) {
        if (user.paymentMethod) {
          const d: ICreatePayment = {
            amount: {
              value: `${subMap.get(user.subscription)}.00`,
              currency: "RUB",
            },
            capture: true,
            payment_method_id: user.paymentMethod,
            description: "Оплата подписки",
          };
          const res = await checkout.createPayment(d);
          if (res.status === "succeeded") {
            user.nextPayment = dayjs().add(30, "days").toDate();
          } else {
            user.subscription = "none";
            user.leftForToday = 0;
            await Router.manager.save(user);
            continue;
          }
        } else {
          user.subscription = "none";
          user.leftForToday = 0;
          await Router.manager.save(user);
        }
      }

      user.leftForToday = subsMap.get(user.subscription) ?? 0;
      await Router.manager.save(user);
    }
  }
}
