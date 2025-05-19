export class PaymentError extends Error {
  public constructor(message: string) {
    super(`Payment Error: ${message}`);
    this.name = "Payment Error";
  }
}
