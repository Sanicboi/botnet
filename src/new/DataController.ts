import { AppDataSource } from "../data-source";
import { User, UserDataType, UserDataTypeMapped } from "../entity/User";
import { Btn } from "../neuro/utils";
import { Bot } from "./Bot";

const map = new Map<UserDataType, string>();
map.set(
  "main",
  "Заполни основные данные, а я их зафиксирую:\n1)Имя Фамилия\n2)Пол\n3)Город (Страна проживания)\n4)Жизненный путь / интересные факты (по желанию)\nОтвет можешь прислать ответным сообщением, расписал информация по пунктам!\nОжидаю ответа!😉",
);
map.set(
  "career",
  "Заполни данные по работе и карьере, а я их зафиксирую:\nТекущая профессия / специальность:\nКомпания / проект (если есть):\nДолжность / роль:\nОпыт работы (где, кем, сколько лет):\nОбразование (университет / курсы / сертификаты):\nКарьерные цели?\nОтвет можешь прислать ответным сообщением, расписал информация по пунктам!\nОжидаю ответа!😉",
);
map.set(
  "personal",
  "Заполни личностные данные, а я их зафиксирую:\n1)Твоя психотип (Холерик; Флегматик; Сангвиник; Меланхолик)\n2)Твои ценности\n3)Любимые занятия / хобби:\n4)Предпочтительный стиль общения (формальный / неформальный):\n5)Как ты принимаешь решения (интуиция / анализ / другие методы):\nОтвет можешь прислать ответным сообщением, расписал информация по пунктам!\nОжидаю ответа!😉",
);
map.set(
  "business",
  `
Заполни данные о бизнесе, а я их зафиксирую: 
1. Общее описание бизнеса:
1.1 Название компании.
1.2 Отрасль, в которой работает компания.
1.3 Основная миссия и ценности компании.
2. Продуктовая линейка:
2.1 Основные продукты или услуги, которые предлагает бизнес.
2.2 Уникальные характеристики продуктов или услуг.
2.3 Дифференциация от конкурентов.
2.4 Жизненный цикл основных продуктов (стадия разработки, роста, зрелости или спада).
3. География бизнеса:
Основные рынки, на которых компания присутствует (города, регионы, страны).
4. Целевая аудитория:
4.1 Кто является основным клиентом? (возраст, пол, социально-экономический статус, предпочтения).
4.2 Важные сегменты аудитории, на которые ориентирован бизнес.
5.Финансовые показатели (По желанию):
5.1 Доходы компании
5.2 Желаемая выручка 
6. Конкурентное окружение:
6.1 Основные конкуренты (если известно).
6.2 Какие преимущества компания имеет перед конкурентами?
7.SWOT анализ (по желанию): 
7.1 Угрозы 
7.2 Возможности 
7.3 Сильные стороны компании 
7.4 Слабые стороны компании 

Ответ можешь прислать ответным сообщением, расписал информация по пунктам! 
Ожидаю ответа!😉
`,
);

const manager = AppDataSource.manager;

export class DataController {
  constructor(private bot: Bot) {
    this.bot.onMyData(this.myData.bind(this));
    this.bot.onDataCategory(this.dataCategory.bind(this));
    this.bot.onData(this.data.bind(this));
  }

  private async myData(user: User) {
    await this.bot.bot.sendMessage(
      +user.chatId,
      "Здесь ты можешь заполнить информацию о себе, тем самым упростить пользование нейро-сотрудниками, так как они уже будут заранее обладать необходимой информацией. \nТем самым ты получаешь личную команду ассистентов, которые все знают о тебе и как следствие результаты использования станут еще конструктивнее и конкретнее!",
      {
        reply_markup: {
          inline_keyboard: [
            Btn("Основная информация", "data-main"),
            Btn("Личность и предпочтения", "data-personal"),
            Btn("Работа и карьера", "data-career"),
            Btn("Бизнес", "data-business"),
          ],
        },
      },
    );
  }

  private async dataCategory(user: User, category: string) {
    const cat = category as UserDataType;
    user.waitingForData = cat;
    await manager.save(user);
    await this.bot.bot.sendMessage(+user.chatId, map.get(cat)!);
  }

  private async data(user: User, text: string) {
    const key: UserDataTypeMapped = (user.waitingForData +
      "data") as UserDataTypeMapped;
    user[key] = text;
    user.waitingForData = "";
    await manager.save(user);
    await this.bot.bot.sendMessage(+user.chatId, "Данные успешно заполнены");
  }

  public async resetData(user: User) {
    user.dialogueData = '';
    user.waitingForData = '';
    user.waitingForPromo = false;

    user.agentId = null;
    user.agent = null;
    user.currentDialogId = null;
    user.currentAudioAgent = null;

    await manager.save(user);
  }

  private async takeFromData(user: User) {
    await this.bot.bot.sendMessage(+user.chatId, 'Выберите раздел данных:', {
      reply_markup: {
        inline_keyboard: [
          Btn('Основные', 'take-main'),
          Btn('Личностные', 'take-personal'),
          Btn('Бизнес', 'take-business'),
          Btn('Карьера', 'take-career')
        ]
      }
    })
  }
}
