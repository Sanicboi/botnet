import { TextView } from "../TextView";

export class PromoExpiredView extends TextView {
  public constructor() {
    super("Кажется, вы не успели(. Данный промокод уже истек.");
  }
}
