import { AppDataSource } from "../data-source";
import { User } from "../entity/User";
import { wait } from "../utils/wait";
import { Bot } from "./Bot";


const manager = AppDataSource.manager;

export class RefController {


    constructor(private bot: Bot) {

    }

    private async ref(user: User) {
        if (user.inviteCount >= 30) return await this.bot.bot.sendMessage(+user.chatId, "К сожалению, приглашение друзей больше недоступно, так как Вы уже пригласили 30 друзей");
        
        await this.bot.bot.sendMessage(+user.chatId, `💌 Вы можете пригласить других пользователей и получить 1000 токенов за каждого пользователя на свой баланс!\n\n- Когда новый пользователь запустит бота, вы получите бесплатные токены на свой баланс;\n- Всего вы можете пригласить 30-x пользователей (вы использовали ${user.inviteCount}/30 приглашений);\n- Пользователь должен впервые воспользоваться ботом по вашей персональной ссылке.\n\nДля приглашения, можете отправить следующее сообщение:`);
        await wait(3);
        await this.bot.bot.sendMessage(+user.chatId, `Привет!👋\n Я нашел крутой сервис — платформа с нейро-сотрудниками для решения и оптимизации разных задач.. 🎯 Уже пользуюсь, и реально удобно!😍\nЕсли хочешь попробовать, переходи по ссылке и запускай бота — тебе понравится! 😉\nhttps://t.me/NComrades_bot?start=${user.chatId}`);
    }
}