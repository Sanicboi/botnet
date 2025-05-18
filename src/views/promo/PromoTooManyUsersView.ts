import { TextView } from "../TextView";

export class PromoTooManyUsersView extends TextView {
  public constructor() {
    super(
      "Кажется, вы не успели(. Количество пользователей, активировавших этот промокод, превысило лимит.",
    );
  }
}
