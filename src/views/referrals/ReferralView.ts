import { Bot } from "../../Bot";
import { wait } from "../../utils/wait";
import { IView } from "../view";

export class ReferralView implements IView {
  private readonly _inviteCount: number;
  private readonly _inviterId: number;

  public constructor(inviteCount: number, inviterId: number) {
    this._inviteCount = inviteCount;
    this._inviterId = inviterId;
  }

  public async send(to: number): Promise<void> {
    await Bot.s_Instance.sendText(
      to,
      `💌 Вы можете пригласить других пользователей и получить 1000 токенов за каждого пользователя на свой баланс!\n\n- Когда новый пользователь запустит бота, вы получите бесплатные токены на свой баланс;\n- Всего вы можете пригласить 30-x пользователей (вы использовали ${this._inviteCount}/30 приглашений);\n- Пользователь должен впервые воспользоваться ботом по вашей персональной ссылке.\n\nДля приглашения, можете отправить следующее сообщение:`,
    );
    await wait(3);
    await Bot.s_Instance.sendText(
      to,
      `Привет!👋\n Я нашел крутой сервис — платформа с нейро-сотрудниками для решения и оптимизации разных задач.. 🎯 Уже пользуюсь, и реально удобно!😍\nЕсли хочешь попробовать, переходи по ссылке и запускай бота — тебе понравится! 😉\nhttps://t.me/NComrades_bot?start=${this._inviterId}`,
    );
  }
}
