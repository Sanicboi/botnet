import OpenAI from "openai";
import { User } from "./entity/User";
import gramjs from 'telegram';
import { Bot } from "./entity/Bot";
import { Queue } from "bullmq";




const messages: string[] = [
    'Расскажите пожалуйста поподробнее. Какие сектора Вы рассматриваете? Что Вам откликается? Ну и самое главное какие условия? Какие требования предъявляете? Какой пакет документов? или как все оформляется?',
    'Пришлите пожалуйста ссылки на Ваши социальные сети, попробую более детально изучить чем Вы занимаетесь',
    'Какой бюджет/процент у Вас заложен на Агентское вознаграждение и как это оформляется? Когда происходит выплата?',
    'Пришлите пожалуйста ссылки на Ваши социальные сети, попробую более детально изучить чем Вы занимаетесь',
    'Подскажите пожалуйста в каком диапазоне цен вы работаете, минимальную и максимальную?',
    'Пришлите пожалуйста ссылки на Ваши социальные сети, попробую более детально изучить чем Вы занимаетесь и как это преподносить нашей аудитории.',
    'Подскажите пожалуйста в каком диапазоне цен вы работаете, минимальную и максимальную?',
    'Пришлите пожалуйста развернуто чем Вы занимаетесь и какие вопросы находятся в Вашей зоне компетенции? На какой бюджет в месяц Вы расчитываете?',
    'Хочу пригласить Вас вступить в клуб. Это Абсолютно бесплатно для Вас. Я от себя подарю Вам членство на 6 месяцев. Чтобы Вы могли спокойно посещать открытые мероприятия бесплатно в качестве резидента, без скрытых платежей.\nИз ближайших мероприятий от 1000 участников, у нас:\n20 и 21.07.2024 Legat Business Congress Москва\nс 16 по 26 августа Business Одиссея в Таиланд (*)\n07 и 08.09.2024 Legat Business Congress Москва\n12 и 13.10.2024 Legat Business Congress Москва\n23 и 24.11.2024 Legat Business Forum Москва\n14 и 15.12.2024 Legat Business Congress Москва (*)\n(*) - мероприятия по себестоимости, так как там включены проживания, перелеты, питание, яхты, регаты, вертолеты и т.д.\nРегистрация делается на сайте https://legatbusiness.com\nМогу помочь с регистрацией и заполнением, скажите когда удобно созвониться и пообщаться?',
    'Для понимания как проходили наши мероприятия, высылаю информацию:\nВидео отчеты крупных мероприятий до 5000 человек:\nhttps://www.youtube.com/watch?v=cWiE3y8Dt1A - Сочи, Россия 10-11 ноября 2024\nhttps://www.youtube.com/watch?v=vVlgNIOOJPM - Анталья, Турция 17-18 мая 2023\nhttps://www.youtube.com/watch?v=92Q6y9wQd7c - Измир, Турция 28-29 апреля 2023\nhttps://www.youtube.com/watch?v=Eg6aH0wIWXI - Анталья, Турция 16-18 декабря 2022\nhttps://www.youtube.com/watch?v=ghzMlrJ2Hw0 - Анталья, Турция 13-14 августа 2022\nВидео отчеты закрытых мероприятий:\nhttps://www.youtube.com/watch?v=AculAxMJBiM- Нетворкинги в Мэрии до 600 человек.\nhttps://www.youtube.com/watch?v=RtxLMjC9qRA - Авторские вечеринки до 1500 человек.\nhttps://www.youtube.com/watch?v=LPnpS1lSc20 - Fashion Style показ на 700 человек.\nhttps://www.youtube.com/watch?v=EGOXQYIAl08 - Fashion Style с Интеграцией.\nПрезентация платформы Legat Business:\nhttps://www.youtube.com/watch?v=4-zOv5qb6r8 - Личный кабинет Legat Business\nLEGAT BUSINESS CLUB\nЭто сообщество предпринимателей в 7 странах, которое помогает участникам и резидентам выйти на новый уровень. Какие запросы мы закрываем внутри клуба со своими резидентами:\nПривлечение инвестиций\nПредоставление платежеспособных клиентов\nАвтоматизация бизнес процессов\nУпаковка и Оцифровка проектов\nЛоббирование интересов\nКорпоративное обучение и повышение квалификации\nФорумы и конгрессы\nНу и конечно, развлекательные мероприятия, парусные регаты, международные туры и сборы.\nСайт клуба:\nhttps://legatbusiness.com - Платформа, социальная сеть для предпринимателей.\nhttps://legatbusinessforum.com - Сайт конгрессов и Форумов\nСоциальные сети компании:\nРазрешенные в РФ:\nhttps://vk.com/legat_business\nhttps://t.me/legatbusinessgroup\nhttps://www.youtube.com/@legatbusinessclub\nhttps://dzen.ru/id/622dc15de47c7702f0a6529a\nhttps://ok.ru/group/70000006080914\nhttps://tenchat.ru/legat_business_group\nНе разрешенные в России:\nhttps://www.facebook.com/legatbusiness\nhttps://www.instagram.com/legat.business\nhttps://www.instagram.com/legat.businessclub\nhttps://x.com/legat_business\nhttps://www.linkedin.com/company/legat-business-congress'
];



export class Determiner {
    private openai: OpenAI;

    constructor(openai: OpenAI) {
        this.openai = openai;
    }

    public async sendDetermined(msg: string, user: User, bot: string, outQueue: Queue) {

        await this.openai.beta.threads.messages.create(user.threadId, {
             content: msg,
             role: 'user'
        });

        const run = this.openai.beta.threads.runs.stream(user.threadId, {
            assistant_id: 'asst_ygct8xSBgVS3W5tb7on7GJ1y'
        }).on('end', async () => {
            let msgs = await run.finalMessages();
            const finalRun = await run.finalRun();
            for (const m of msgs) {
                await outQueue.add('send', {
                    bot: bot,
                    user: user.usernameOrPhone,
                    // @ts-ignore
                    text: m.content[0].text.value
                })
            }
            if (finalRun.status === 'requires_action' && finalRun.required_action.type === 'submit_tool_outputs') {
                // Отправь сообщение!
                const data: {number: number} = JSON.parse(finalRun.required_action.submit_tool_outputs.tool_calls[0].function.arguments);
                const n = data.number - 1;
                await outQueue.add('send', {
                    bot: bot,
                    user: user.usernameOrPhone,
                    text: messages[n]
                });
                msgs = await this.openai.beta.threads.runs.submitToolOutputsStream(finalRun.thread_id, finalRun.id, {
                    tool_outputs: [
                        {
                            output: 'Сообщение отправлено. Жди ответа клиента.',
                            tool_call_id: finalRun.required_action.submit_tool_outputs.tool_calls[0].id
                        }
                    ]
                }).finalMessages();
                for (const m of msgs) {
                    await outQueue.add('send', {
                        bot: bot,
                        user: user.usernameOrPhone,
                        // @ts-ignore
                        text: m.content[0].text.value
                    })
                }
                await this.openai.beta.threads.messages.create(finalRun.thread_id, {
                    content: messages[n],
                    role: 'assistant'
                });
            }
        });
    }

}