import dayjs from "dayjs";
import { AppDataSource } from "../data-source";
import { SubType, User } from "../entity/User";
import { SupportedModels } from "../utils/Models";
import { Bot } from "./Bot";
import { Converter } from "./Converter";
import { Btn } from "../neuro/utils";
import { ICreatePayment, YooCheckout } from "@a2seven/yoo-checkout";

const manager = AppDataSource.manager;

const checkout = new YooCheckout({
  secretKey: process.env.YOOKASSA_KEY ?? "",
  shopId: process.env.YOOKASSA_SHOP_ID ?? "",
});

const subToTokensMap: Map<string, number> = new Map();
subToTokensMap.set("none", 0);
subToTokensMap.set("lite", 5000);
subToTokensMap.set("pro", 30000);
subToTokensMap.set("premium", 45000);
subToTokensMap.set("exclusive", 135000);

const subToPriceMap = new Map<string, number>();
subToPriceMap.set("lite", 490);
subToPriceMap.set("pro", 790);
subToPriceMap.set("premium", 1490);
subToPriceMap.set("exclusive", 3490);

/**
 * This class is made to handle the balance of the user
 */
export class BalanceController {
  constructor(private bot: Bot) {
    bot.onBalance(this.balance.bind(this));
  }

  /**
   * Checks the balance and sends the message if not sufficient funds are given
   * @param user User
   * @param threshold Threshold in RUB
   */
  public async checkBalance(
    user: User,
    threshold: number = 0,
  ): Promise<{
    exists: boolean;
    limit: number;
  }> {
    const sum = user.addBalance + user.leftForToday;
    if (sum <= threshold) {
      await this.bot.bot.sendMessage(
        +user.chatId,
        "❌Упс! У вас закончились токены.\nЧтобы продолжить пользоваться ботом, вам нужно оформить подписку или купить отдельный комплект токенов…",
      );
      return {
        exists: false,
        limit: 0,
      };
    }

    return {
      exists: true,
      limit: Converter.RUBTK(sum, user.model),
    };
  }

  /**
   * Subtract the tokens
   * @param user User
   * @param resultTokens tokens to subtract
   */
  public async editBalance(user: User, resultTokens: number) {
    const inRUB = Converter.TKRUB(resultTokens, user.model);
    let toSubtract = inRUB;
    toSubtract -= Math.min(user.leftForToday, inRUB);
    user.leftForToday -= Math.min(user.leftForToday, inRUB);
    if (toSubtract > 0) user.addBalance -= toSubtract;
    await manager.save(user);
  }

  private async balance(user: User) {
    const now = dayjs();
    await this.bot.bot.sendMessage(
      +user.chatId,
      `Баланс и подписка\n\n🟣 Формат доступа:\n⤷ ${user.subscription === "exclusive" ? "Exclusive" : user.subscription === "premium" ? "Premium" : user.subscription === "pro" ? "PRO+" : user.subscription === "lite" ? "Lite" : "Бесплатный доступ"}\n\n⤷ Сегодня осталось: ${Converter.RUBSMT(user.leftForToday).toFixed(0)} / ${subToTokensMap.get(user.subscription)} токенов\n⤷ Новое пополнение через: ${user.subscription === "none" ? "Нет" : `${24 - now.hour()}:${59 - now.minute()}`}\n⤷ Следующий платеж: ${user.nextPayment == null ? "Нет" : user.nextPayment.toUTCString()}\n\n🟣 Ваш комплект токенов:\n⤷ ${Converter.RUBSMT(user.addBalance).toFixed(0)}\n\n\n📦 Если вам не хватает ежедневных токенов по подписке – вы можете купить комплект токенов. Комплект токенов можно использовать в любое время без лимитов. Полезно, когда вам требуется много токенов за раз.\n\nПеред покупкой комплекта токенов или подписки, настоятельно рекомендуем ознакомиться со [справкой о тарифах](https://docs.google.com/document/d/1CbyIi8h7e51B2OUEcXe85PS9FhLw8Mli7iw4o0RRCDM/edit)`,
      {
        reply_markup: {
          inline_keyboard: [
            Btn("Купить подписку", "b-sub"),
            Btn("Купить токены", "b-tokens"),
          ],
        },
        parse_mode: "Markdown",
      },
    );
  }

  private async buySubscription(user: User) {
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

  private async subType(user: User, t: string) {
    const type = t as SubType;
    const price = subToPriceMap.get(t)!;

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
}
