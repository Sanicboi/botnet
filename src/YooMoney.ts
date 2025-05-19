import { ICreatePayment, YooCheckout } from "@a2seven/yoo-checkout";
import { EnvError } from "./errors/EnvError";
import { PaymentError } from "./errors/PaymentError";

export type PaymentData = {
  url: string;
  id: string;
};

export type PaymentInfo = {
  userId: number;
  amount: number;
};

export class YooMoney {
  private readonly _checkout: YooCheckout;

  private constructor() {
    if (!process.env.YOOKASSA_KEY) throw new EnvError("YOOKASSA_KEY");
    if (!process.env.YOOKASSA_SHOP_ID) throw new EnvError("YOOKASSA_SHOP_ID");

    this._checkout = new YooCheckout({
      shopId: process.env.YOOKASSA_SHOP_ID,
      secretKey: process.env.YOOKASSA_KEY,
    });
  }

  private static _instance?: YooMoney;

  public static get s_Instance(): YooMoney {
    if (!this._instance) {
      this._instance = new YooMoney();
    }

    return this._instance;
  }

  public async createPayment(
    amount: number,
    description: string,
    customerId: number,
    save: boolean = false,
    paymentMethod?: string,
  ): Promise<PaymentData> {
    const payment: ICreatePayment = {
      amount: {
        currency: "RUB",
        value: `${amount}.00`,
      },
      save_payment_method: save,
      capture: true,
      confirmation: {
        type: "redirect",
        return_url: "https://t.me/NComrades_bot",
      },
      description,
      payment_method_id: paymentMethod,
      merchant_customer_id: String(customerId),
    };

    const result = await this._checkout.createPayment(payment);

    if (!result.confirmation.confirmation_url)
      throw new PaymentError("No confirmation URL");

    return {
      id: result.id,
      url: result.confirmation.confirmation_url,
    };
  }

  public async getPayment(id: string): Promise<PaymentInfo> {
    const result = await this._checkout.getPayment(id);

    if (result.status !== "succeeded")
      throw new PaymentError("Payment not succeeded");
    if (!result.merchant_customer_id)
      throw new PaymentError("Merchant customer id is null");

    return {
      amount: +result.amount.value,
      userId: +result.merchant_customer_id,
    };
  }
}
