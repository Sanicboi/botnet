import dayjs from "dayjs";
import { AppDataSource } from "../../../../data-source";
import { SubType, User } from "../../../../entity/User";
import { Bot } from "../../../Bot";
import { IController } from "../../Controller";
import { Converter } from "./Converter";
import { InlineKeyboardButton } from "node-telegram-bot-api";
import { Btn } from "../../../utils";
import { ICreatePayment, YooCheckout } from "@a2seven/yoo-checkout";

const manager = AppDataSource.manager;

const checkout = new YooCheckout({
  secretKey: process.env.YOOKASSA_KEY ?? "",
  shopId: process.env.YOOKASSA_SHOP_ID ?? "",
});

const tokensToPriceMap: Map<number, number> = new Map();
tokensToPriceMap.set(10000, 99);
tokensToPriceMap.set(30000, 255);
tokensToPriceMap.set(10000, 690);
tokensToPriceMap.set(200000, 1490);
tokensToPriceMap.set(500000, 3525);
tokensToPriceMap.set(1000000, 4990);

const priceToTokensMap: Map<number, number> = new Map();

for (const [k, v] of tokensToPriceMap) {
  priceToTokensMap.set(v, k);
}

const subToTokensMap: Map<string, number> = new Map();
subToTokensMap.set("none", 0);
subToTokensMap.set("lite", 5000);
subToTokensMap.set("pro", 30000);
subToTokensMap.set("premium", 45000);
subToTokensMap.set("exclusive", 135000);

const subToPriceMap = new Map<SubType, number>();
subToPriceMap.set("lite", 490);
subToPriceMap.set("pro", 790);
subToPriceMap.set("premium", 1490);
subToPriceMap.set("exclusive", 3490);

const priceToSubMap: Map<number, SubType> = new Map();

for (const [k, v] of subToPriceMap) {
  priceToSubMap.set(v, k);
}

/**
 * Контроллер баланса
 * следит за балансом пользователя и занимается всем, связанным с оплатой
 */
export class BalanceController implements IController {
  /**
   * конструктор
   * @param bot Бот
   */
  constructor(private bot: Bot) {}

  /**
   * Привязка
   */
  public bind() {}

  /**
   * Метод получения максимального количества токенов для генерации или отправки сообщения об их отсутствии
   * @param user Пользователь
   * @returns Лимит или false, если токенов нет
   */
  public async getLimit(user: User): Promise<number | false> {
    const sum = user.addBalance + user.leftForToday;
    if (sum <= 0) {
      await this.bot.bot.sendMessage(
        +user.chatId,
        "❌Упс! У вас закончились токены.\nЧтобы продолжить пользоваться ботом, вам нужно оформить подписку или купить отдельный комплект токенов…",
      );
      return false;
    }

    return Converter.RUBTK(sum, user.model);
  }

  /**
   * Метод списания суммы с баланса
   * @param rubles сколько рублей списать
   * @param user пользователь
   */
  public async subtractCost(rubles: number, user: User) {
    let toSubtract = rubles;
    let min = Math.min(user.leftForToday, rubles);
    toSubtract -= min;
    user.leftForToday -= min;
    if (toSubtract > 0) user.addBalance -= toSubtract;
    await manager.save(user);
  }

  private async onBalance(user: User) {
    const now = dayjs();

    let keyboard: InlineKeyboardButton[][] = [Btn("Купить токены", "b-tokens")];
    if (user.subscription === "none") {
      keyboard.push(Btn("Купить подписку", "b-sub"));
    } else {
      keyboard.push(Btn("Отменить подписку", "cancel-sub"));
    }

    await this.bot.bot.sendMessage(
      +user.chatId,
      `Баланс и подписка\n\n🟣 Формат доступа:\n⤷ ${user.subscription === "exclusive" ? "Exclusive" : user.subscription === "premium" ? "Premium" : user.subscription === "pro" ? "PRO+" : user.subscription === "lite" ? "Lite" : "Бесплатный доступ"}\n\n⤷ Сегодня осталось: ${Converter.RUBSMT(user.leftForToday).toFixed(0)} / ${subToTokensMap.get(user.subscription)} токенов\n⤷ Новое пополнение через: ${user.subscription === "none" ? "Нет" : `${24 - now.hour()}:${59 - now.minute()}`}\n⤷ Следующий платеж: ${user.nextPayment == null ? "Нет" : user.nextPayment.toUTCString()}\n\n🟣 Ваш комплект токенов:\n⤷ ${Converter.RUBSMT(user.addBalance).toFixed(0)}\n\n\n📦 Если вам не хватает ежедневных токенов по подписке – вы можете купить комплект токенов. Комплект токенов можно использовать в любое время без лимитов. Полезно, когда вам требуется много токенов за раз.\n\nПеред покупкой комплекта токенов или подписки, настоятельно рекомендуем ознакомиться со [справкой о тарифах](https://docs.google.com/document/d/1CbyIi8h7e51B2OUEcXe85PS9FhLw8Mli7iw4o0RRCDM/edit)`,
      {
        reply_markup: {
          inline_keyboard: keyboard,
        },
        parse_mode: "Markdown",
      },
    );
  }

  private async onBuySubscription(user: User) {
    await this.bot.bot.sendMessage(
      +user.chatId,
      "👇Выберите условия подписки:",
      {
        reply_markup: {
          inline_keyboard: [
            Btn("Lite |5.000 токенов/день| (490₽/мес)", "sub-lite"),
            Btn("Pro+ |30.000 токенов/день| (790₽/мес)", "sub-pro"),
            Btn("Premium |45.000 токенов/день| (1490₽/мес)", "sub-premium"),
            Btn(
              "Exclusive |135.000 токенов/день| (3490₽/мес)",
              "sub-exclusive",
            ),
            Btn("Назад", "balance"),
          ],
        },
      },
    );
  }

  private async onSubType(user: User, t: string) {
    const type = t as SubType;
    const price = subToPriceMap.get(type)!;

    const invoice: ICreatePayment = {
      amount: {
        currency: "RUB",
        value: `${price}.00`,
      },
      capture: true,
      confirmation: {
        type: "redirect",
        return_url: "https://t.me/NComrades_bot",
      },
      description: `Оплата подписки`,
      merchant_customer_id: user.chatId,
      save_payment_method: true,
    };

    const result = await checkout.createPayment(invoice);
    await this.bot.bot.sendMessage(
      +user.chatId,
      'Пожалуйста, оплатите счет. После оплаты нажмите "Я оплатил"',
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Оплатить",
                url: result.confirmation.confirmation_url,
              },
            ],
            Btn("Я оплатил", `ihavepaid-sub-${result.id}`),
          ],
        },
      },
    );
  }

  private async onTokensType(user: User, n: number) {
    const price = tokensToPriceMap.get(n)!;

    const invoice: ICreatePayment = {
      amount: {
        currency: "RUB",
        value: `${price}.00`,
      },
      capture: true,
      confirmation: {
        type: "redirect",
        return_url: "https://t.me/NComrades_bot",
      },
      description: `Оплата пакета токенов: ${n} токенов`,
      merchant_customer_id: user.chatId,
    };

    const result = await checkout.createPayment(invoice);
    await this.bot.bot.sendMessage(
      +user.chatId,
      'Пожалуйста, оплатите счет. После оплаты нажмите "Я оплатил"',
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Оплатить",
                url: result.confirmation.confirmation_url,
              },
            ],
            Btn("Я оплатил", `ihavepaid-tokens-${result.id}`),
          ],
        },
      },
    );
  }

  private async onIHavePaid(user: User, data: string, msgId: number) {
    try {
      if (data.startsWith("ihavepaid-tokens-")) {
        const id = data.substring(17);
        const res = await checkout.getPayment(id);
        if (res.status === "succeeded") {
          if (res.merchant_customer_id === user.chatId) {
            const amount = parseInt(res.amount.value);
            const tokens = priceToTokensMap.get(amount)!;
            user.addBalance += Converter.SMTRUB(tokens);
            await manager.save(user);
            await this.bot.bot.sendMessage(
              +user.chatId,
              "Оплата успешно прошла 🚀\nБаланс токенов пополнен, подробнее: /balance\nПриятного пользования😉",
            );
            await this.bot.bot.deleteMessage(+user.chatId, msgId);
          }
        } else if (res.status === "canceled") {
          await this.bot.bot.sendMessage(
            +user.chatId,
            "Платеж отменен. Попробуйте снова",
          );
          await this.bot.bot.deleteMessage(+user.chatId, msgId);
        } else {
          await this.bot.bot.sendMessage(+user.chatId, "Завершите платеж");
        }
      } else {
        const id = data.substring(14);
        const res = await checkout.getPayment(id);
        if (res.status === "succeeded") {
          if (res.merchant_customer_id === user.chatId) {
            user.subscription = priceToSubMap.get(parseInt(res.amount.value))!;
            user.leftForToday = Converter.SMTRUB(
              subToTokensMap.get(user.subscription)!,
            );
            user.nextPayment = dayjs().add(30, "days").toDate();
            if (res.payment_method_id) {
              user.paymentMethod = res.payment_method_id;
            }
            await manager.save(user);
            await this.bot.bot.sendMessage(
              +user.chatId,
              "Оплата успешно прошла 🚀\nБаланс токенов пополнен, подробнее: /balance\nПриятного пользования😉",
            );
            await this.bot.bot.deleteMessage(+user.chatId, msgId);
          }
        } else if (res.status === "canceled") {
          await this.bot.bot.sendMessage(
            +user.chatId,
            "Платеж отменен. Попробуйте снова",
          );
          await this.bot.bot.deleteMessage(+user.chatId, msgId);
        } else {
          await this.bot.bot.sendMessage(+user.chatId, "Завершите платеж");
        }
      }
    } catch (err) {
      console.error(err);
      await this.bot.bot.deleteMessage(+user.chatId, msgId);
    }
  }

  private async resetSub(user: User) {
    user.paymentMethod = null;
    user.subscription = "none";
    user.leftForToday = 0;
    user.nextPayment = null;
    await manager.save(user);
    await this.bot.bot.sendMessage(
      +user.chatId,
      "Ваша подписка закончилась. Вы всегда можете ее продлить в меню 'баланс и подписка'",
    );
  }

  private async updateSub(user: User) {
    if (user.subscription !== "none") {
      const now = dayjs();
      if (now.isAfter(dayjs(user.nextPayment))) {
        // next payment
        if (!user.paymentMethod) {
          return await this.resetSub(user);
        }

        const invoice: ICreatePayment = {
          amount: {
            value: `${subToPriceMap.get(user.subscription)}.00`,
            currency: "RUB",
          },
          capture: true,
          payment_method_id: user.paymentMethod,
          description: "Оплата подписки",
        };

        const res = await checkout.createPayment(invoice);

        if (res.status === "succeeded") {
          user.nextPayment = dayjs().add(30, "days").toDate();
          await manager.save(user);
        } else {
          await this.resetSub(user);
        }
      }
    }
  }

  private async updateTokens(user: User) {
    await this.updateSub(user);
    if (user.subscription !== "none") {
      user.leftForToday = Converter.SMTRUB(
        subToTokensMap.get(user.subscription)!,
      );
      await manager.save(user);
      await this.bot.bot.sendMessage(
        +user.chatId,
        "Ваш ежедневный запас токенов пополнен!",
        {},
      );
    }
  }

  private async onCancelSub(user: User) {
    user.paymentMethod = "";
    await manager.save(user);
    await this.bot.bot.sendMessage(
      +user.chatId,
      "Дальнешая оплата подписки будет приостановлена. Подписка продолжит действие до конца оплаченного периода",
    );
  }
}
