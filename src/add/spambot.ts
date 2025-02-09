import TelegramBot from "node-telegram-bot-api"
import { AppDataSource } from "../data-source";
import { User } from "../entity/User";
import { MessageFormatter } from "../utils/MessageFormatter";

const bot = new TelegramBot(process.env.SPAMBOT_TOKEN ?? "",  {
    polling: true
});

bot.setMyCommands([
    {
        command: "about",
        description: "🤖О боте"
    },
    {
        command: "company",
        description: "🤝О нас (SmartComrade)"
    },
    {
        command: "links",
        description: "🌱Актуальные ссылки"
    },
    {
        command: "materials",
        description: "🚀Полезные материалы"
    },
    {
        command: "support",
        description: "💡Поддержка"
    }
]);

AppDataSource.initialize();

bot.onText(/\/about/, async (msg) => {
    await bot.sendMessage(msg.from!.id, "Давай я тебе расскажу немного о себе! Для того, чтобы все встало на свои места. Я могу быть твоим незаменимым помощником и информатором)\n\nДля чего я тут?\n🔸Буду сообщать тебе про все важные обновления и улучшения на платформе\n🔸Буду спонсировать тебя обалденной полезной информацией из мира нейро-сетей\n🔸Дам тебе доступ к обещанным подарочным материалам\n🔸Здесь ты сможешь периодически получать аналитику и подходить итоги пользования платформой\n\nСо всей любовью, бот-помощник SmartComrade🫶");
});

bot.onText(/\/company/, async (msg) => {
    await bot.sendMessage(msg.from!.id, "Привет! 👋 На связи SmartComrade)\nМы представляем систему профильных нейро-сотруднкиов под решение любых задач.\n\n💡Только представь: \nОбученные специалисты разных направлений (От бизнес-специалистов - до AI репетиторов и кино-экспертов), которые готовы пахать на тебя 24/7.\n\n🚀 Это отличная возможность оптимизировать жизненные и профессиональные процессы качественно\nНейро-сотрудники от SmartComrade:\n\n🧬 Ваши персональные помощники прямо в телеграмм\n🧬 AI сотрудники, которым не нужен VPN.\n🧬 Все популярные модели AI в одном месте\n🧬 Возможность распознавать фото, аудио сообщения, файлы\n🧬 Более 15 профильных систем, в совершенно разных сферах\n🧬 24/7 под рукой\n\nА вот и актуальная ссылка:\n@NComrades_bot\n🎁 Кстати, не забудь активировать бесплатные токены и получи доступ к передовым моделям ИИ прямо сейчас");
})

bot.onText(/\/links/, async (msg) => {
    await bot.sendMessage(msg.from!.id, "✅Все честно и прозрачно\nВот и ссылочки:\n🔸Наш канал: https://t.me/SmartComrade1\n\n🔸Ссылка на платформу с нейро-специалистами: @NComrades_bot\n\n🔸О компании: SmartComrade.pdf\n\n🔸Политика конфиденциальности: Политика конфиденциальности\n\n🔸Условия обслуживания: Условия обслуживания\n\n🔸Условия оплаты: Рекурентные платежи\n\n🔸Справка по тарифам: Справка о тарифах");
})

bot.onText(/\/support/, async (msg) => {
    await bot.sendMessage(msg.from!.id, "Возникли вопросы или предложения, пишите нам:\nОтветим в ближайшее время))\nEmail:\nsmartcomradeai@gmail.com\nTg:\n@SmartComrade_Support");
})

bot.onText(/\/start/, async (msg) => {
    // let user = await AppDataSource.manager.findOneBy(User, {
    //     chatId: String(msg.from!.id)
    // });

    // if (!user) {
    //     user = new User();
    //     user.chatId = String(msg.from!.id);
    //     await AppDataSource.manager.save(user);
    // }

    await MessageFormatter.sendTextFromFileBot(bot, "startleadmagnit.txt", msg.from!.id);
})

bot.onText(/\/materials/, async (msg) => {
    await bot.sendMessage(msg.from!.id, "Мы подготовили для вас обалденные полезные материалы, которые упростят жизнь и спасут от головной боли 🎁\nВот, что у нас для вас есть:\nПодборка 500 нейро-сетей под разные задачи \nПодборка нейро-сетей для оптимизации процессов в разных бизнес-нишах\nПодборка промтов от экспертов SmartComrade\nНейро-связки для оптимизации целых бизнес-процессов \n\nДля того, чтобы забрать их, необходимо выполнить всего несколько условий: \nПодписаться на наш канал: https://t.me/SmartComrade1\nАктивироваться на нашей платформе: @NComrades_bot\n(достаточно просто нажать «START»)", {
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: "Я все выполнил",
                        callback_data: "complete"
                    }
                ]
            ]
        }
    })
});

bot.on("callback_query", async (q) => {
    const u = await AppDataSource.manager.findOneBy(User, {
        chatId: String(q.from.id)
    });

    const member = await bot.getChatMember(-1002458365675, q.from.id);

    if (!member || !u) return await bot.sendMessage(q.from.id, "Кажется, вы не выполнили все условия");

    await bot.sendMessage(q.from.id, "Отлично! А вот и обещанные материалы:\n https://teletype.in/@smartcomrade/PI7rcWYq-wV");
    await MessageFormatter.sendDocumentBot("prompts.pdf", bot, q.from.id);
    await MessageFormatter.sendDocumentBot("other.pdf", bot, q.from.id);
})

