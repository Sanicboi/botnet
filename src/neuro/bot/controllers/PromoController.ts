import { AppDataSource } from "../../../data-source";
import { PromoCode } from "../../../entity/assistants/Promo";
import { UserPromo } from "../../../entity/assistants/UserPromo";
import { User } from "../../../entity/User";
import { Bot } from "../../Bot";
import { IController } from "../Controller";

const manager = AppDataSource.manager;

export class PromoController implements IController {
  constructor(private bot: Bot) {}

  public bind() {
    this.bot.bot.onText(/\/free/, async (msg) => {
      const user = await this.bot.getUser(msg);
      await this.onFreeTokens(user);
    });

    this.bot.addFreeTextListener(async (msg) => {
      const user = await this.bot.getUser(msg);
      if (user.waitingForPromo) {
        await this.onPromoCode(user, msg.text!);
      }
    });
  }

  private async onFreeTokens(user: User) {
    user.waitingForPromo = true;
    await manager.save(user);
    await this.bot.bot.sendMessage(
      +user.chatId,
      `В этом разделе ты можешь активировать промокод и забрать подарки от команды SmartComrade 🎁\nДля активации промокода, напиши кодовое слово в ответном сообщении.\n❗️Важно: при активации автоматически доступен промокод START на 7000 токенов.`,
    );
  }

  private async onPromoCode(user: User, name: string) {
    user.waitingForPromo = false;
    const promo = await manager.findOne(PromoCode, {
      where: {
        name,
      },
      relations: {
        userPromos: true,
      },
    });

    if (!promo) {
      await this.bot.bot.sendMessage(
        +user.chatId,
        "❌Упс! Что-то пошло не так. Убедитесь, что промокод введен правильно и попробуйте еще раз. ❗️Важно: один и тот же промокод нельзя активировать несколько раз",
      );
    } else {
      if (promo.expiresAt < new Date()) {
        await this.bot.bot.sendMessage(
          +user.chatId,
          "Кажется, вы не успели(. Данный промокод уже истек.",
        );
      } else if (promo.limit <= promo.userPromos.length) {
        await this.bot.bot.sendMessage(
          +user.chatId,
          "Кажется, вы не успели(. Количество пользователей, активировавших этот промокод, превысило лимит.",
        );
      } else if (
        promo.userPromos.findIndex(
          (el) => el.userId === String(+user.chatId),
        ) >= 0
      ) {
        await this.bot.bot.sendMessage(
          +user.chatId,
          "Кажется, вы уже ввели этот промокод.",
        );
      } else {
        const uPromo = new UserPromo();
        uPromo.promoId = promo.name;
        uPromo.promo = promo;
        uPromo.userId = user.chatId;
        uPromo.user = user;
        await manager.save(uPromo);
        user.addBalance += promo.amount;
        await this.bot.bot.sendMessage(
          +user.chatId,
          "Промокод успешно активирован!",
        );
      }
    }
  }
}
