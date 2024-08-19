import TgBot from "node-telegram-bot-api";
import { Client } from "./entity/Client";
import { AppDataSource } from "./data-source";

const wait = async (s: number) => {
  await new Promise((resolve, reject) => setTimeout(resolve, 1000 * s));
};

AppDataSource.initialize().then(async () => {
  const bot = new TgBot("7438649358:AAEOpoCf_Anga0e8oaIsZkKL3Va3DjsOE_I", {
    polling: true,
  });
  const userRepo = AppDataSource.getRepository(Client);

  bot.onText(/\/start/, async (msg) => {
    const user = new Client();
    user.chatId = String(msg.from!.id);
    await userRepo.save(user);
    await bot.sendMessage(
      msg.from!.id,
      "Привет! Для начала давай познакомимся))\nКак к тебе обращаться?"
    );
  });
  bot.onText(/./, async (msg) => {
    await wait(0.5);
    if (!msg.text!.startsWith("/")) {
      const user = await userRepo.findOneBy({
        chatId: String(msg.from!.id),
      });
      if (user) {
        if (!user.name) {
          user.name = msg.text!;
          await bot.sendMessage(
            msg.from!.id,
            `${user.name}, расскажи, пожалуйста чем занимаешься?`
          );
        } else if (!user.sphere) {
          user.sphere = msg.text!;
          await bot.sendMessage(
            msg.from!.id,
            `Ого! Это очень востребованная сфера`
          );
          await wait(2);
          await bot.sendMessage(
            msg.from!.id,
            `Подскажи, какой штат сотрудников в бизнесе?`
          );
        } else if (!user.employees) {
          user.employees = msg.text!;
          await bot.sendMessage(msg.from!.id, "Супер");
          await wait(1);
          await bot.sendMessage(msg.from!.id, "Какой текущий оборот бизнеса (в денежном эквиваленте)?", {
            reply_markup: {
              keyboard: [
                [
                  {
                    text: "Пропустить",
                  },
                ],
              ],
              one_time_keyboard: true,
              resize_keyboard: true
            },
          });
        } else if (!user.cashflow) {
          user.cashflow = msg.text!;
          await bot.sendMessage(
            msg.from!.id,
            "Какую сферу ты бы хотел(а) оптимизировать при помощи ИИ сотрудника?",
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "Отдел продаж",
                      callback_data: "sales",
                    },
                  ],
                  [
                    {
                      text: "Лидогенерация",
                      callback_data: "mailer",
                    },
                  ],
                  // [
                  //     {
                  //         text: 'Ведение соц.сетей',
                  //         callback_data: 'smm'
                  //     }
                  // ],
                  [
                    {
                      text: "Подписчики в соц.сети",
                      callback_data: "commenter",
                    },
                  ],
                  [
                    {
                      text: "Подбор персонала",
                      callback_data: "hr",
                    },
                  ],
                  [
                    {
                      text: "Другая",
                      callback_data: "other",
                    },
                  ],
                ],
              },
            }
          );
        } else if (!user.optimizing) {
          //@ts-ignore
          user.optimizing = msg.text;
          if (user.optimizing != "other") {
            let keyboard: TgBot.KeyboardButton[][] = [];
            switch (user.optimizing) {
              case "sales":
                keyboard = [
                  [
                    {
                      text: "Увеличение конверсии (CR) в продажу",
                    },
                  ],
                  [
                    {
                      text: "Отслеживание эффективности сотрудника",
                    },
                  ],
                  [
                    {
                      text: "Контроль выполнения плана продаж",
                    },
                  ],
                ];
                break;
              case "mailer":
                keyboard = [
                  [
                    {
                      text: "Лидогенерация (продажа продуктов)",
                    },
                  ],
                  [
                    {
                      text: "Лидогенерация (привлечение инвестиций)",
                    },
                  ],
                  [
                    {
                      text: "Лидогенерация (поиск партнеров)",
                    },
                  ],
                ];
                break;
              case "commenter":
                keyboard = [
                  [
                    {
                      text: "Набор подписчиков в ТГ канал",
                    },
                  ],
                  [
                    {
                      text: "Набор подписчиков в канал ВК",
                    },
                  ],
                ];
                break;
              case "hr":
                keyboard = [
                  [
                    {
                      text: "Поиск кадров",
                    },
                  ],
                  [
                    {
                      text: "Квалификация кадров",
                    },
                  ],
                  [
                    {
                      text: "Управление персоналом",
                    },
                  ],
                ];
                break;
            }
            await bot.sendMessage(
              msg.from!.id,
              "Какую задачу в данном сегменте вы бы хотели решить с помощью ИИ? (Выберите из списка или укажите другую)",
              {
                reply_markup: {
                  keyboard,
                  one_time_keyboard: true,
                  resize_keyboard: true
                },
              }
            );
          }
        } else if (!user.task) {
          user.task = msg.text!;
          if (user.optimizing == "sales") {
            await bot.sendMessage(
              msg.from!.id,
              "Сколько людей подключено в отдел продаж?"
            );
          } else if (user.optimizing == "mailer") {
            await bot.sendMessage(
              msg.from!.id,
              "Подскажите, пожалуйста, у вас есть базы контактов (клиентов), с которыми необходимо коммуницировать?",
              {
                reply_markup: {
                  keyboard: [
                    [
                      {
                        text: "Да",
                      },
                      {
                        text: "Нет",
                      },
                    ],
                  ],
                  resize_keyboard: true,
                  one_time_keyboard: true
                },
              }
            );
          } else if (user.optimizing == "commenter") {
            await bot.sendMessage(
              msg.from!.id,
              "Создан ли сейчас у вас канал? Если да, то пришлите ссылку"
            );
          } else if (user.optimizing == "hr") {
            await bot.sendMessage(
              msg.from!.id,
              "Постарайтесь максимально подробно описать что вы хотите увидеть от ИИ сотрудника и какую задачу хотели бы переложить на него"
            );
          }
        } else {
          if (user.optimizing == "sales") {
            if (!user.peopleInSales) {
              user.peopleInSales = msg.text!;
              await bot.sendMessage(
                msg.from!.id,
                "Какой формат работы отдела продаж?",
                {
                  reply_markup: {
                    keyboard: [
                      [
                        {
                          text: "Исходящий",
                        },
                      ],
                      [
                        {
                          text: "Входящий",
                        },
                      ],
                      [
                        {
                          text: "Оба",
                        },
                      ],
                    ],
                    one_time_keyboard: true,
                    resize_keyboard: true
                  },
                }
              );
            } else if (!user.salesFormat) {
              user.salesFormat = msg.text!;
              await bot.sendMessage(
                msg.from!.id,
                "Требуется ли вам поддержка в написании скриптов продаж?",
                {
                  reply_markup: {
                    keyboard: [
                      [
                        {
                          text: "Да",
                        },
                        {
                          text: "Нет",
                        },
                      ],
                    ],
                    one_time_keyboard: true,
                    resize_keyboard: true
                  },
                }
              );
            } else if (user.scriptHelp === null) {
              user.scriptHelp = msg.text === "Да";
              await bot.sendMessage(
                msg.from!.id,
                "В какую систему идет выгрузка по эффективности отдела продаж? (выбери или напиши свою)",
                {
                  reply_markup: {
                    keyboard: [
                      [
                        {
                          text: "Bitrix24",
                        },
                      ],
                      [
                        {
                          text: "AmoCRM",
                        },
                      ],
                      [
                        {
                          text: "Нет выгрузки",
                        },
                      ],
                    ],
                    one_time_keyboard: true,
                    resize_keyboard: true
                  },
                }
              );
            } else if (!user.salesStats) {
              user.salesStats = msg.text!;
              await bot.sendMessage(
                msg.from!.id,
                "Какой средний ежемесячный V заявок?",
                {
                  reply_markup: {
                    keyboard: [
                      [
                        {
                          text: "не знаю",
                        },
                      ],
                    ],
                    resize_keyboard: true,
                    one_time_keyboard: true
                  },
                }
              );
            } else if (!user.monthlyV) {
              user.monthlyV = msg.text!;
              await bot.sendMessage(msg.from!.id, "Отлично, зафиксировал");
              await wait(1);
              await bot.sendMessage(
                msg.from!.id,
                "Я уже передал техническое задание нашим специалистам. В ближайшее время необходимо связаться для уточнения деталей.\nНапишите дату и время , удобную для звонка!"
              );
            } else if (!user.callTime) {
              user.callTime = msg.text!;
              await bot.sendMessage(msg.from!.id, "Ожидайте звонка))");
              await wait(1);
              await bot.sendMessage(msg.from!.id, "До скорых встреч");
              await bot.sendMessage(
                -1002242067427,
                `
                        Юзер:
                        Имя: ${user.name} (${msg.from?.username})
                        Сфера: ${user.sphere}
                        Сотрудники: ${user.employees}
                        Оборот: ${user.cashflow}
                        Оптимизировать: ${user.optimizing}
                        Задача: ${user.task}
                        Людей в отделе продаж: ${user.peopleInSales}
                        Формат работы отдела: ${user.salesFormat}
                        Поддержка в написании скриптов: ${user.scriptHelp}
                        Система выгрузки ОП: ${user.salesStats}
                        Ежемесячный V: ${user.monthlyV}
                        Базы для диалога: ${user.hasBases}
                        Подключен ОП: ${user.hasSales}
                        Система для лидов: ${user.mailerCrm}
                        Текущая конверсия: ${user.averageCR}
                        Цель: ${user.goal}
                        Есть ли канал: ${user.channelLink}
                        Знаком ли с комментингом: ${user.knowsCommenting}
                        Максимально подробная цель: ${user.finalGoal}
                        Метрика ЕйчАр: ${user.hrMetrics}
                        Был ли смм: ${user.hasSmm}
                        Дата звонка: ${user.callTime}
                    `
              );
            }
          } else if (user.optimizing == "mailer") {
            if (user.hasBases === null) {
              user.hasBases = msg.text === "Да";
              await bot.sendMessage(
                msg.from!.id,
                "Подскажите, пожалуйста, у вас подключен отдел продаж?",
                {
                  reply_markup: {
                    one_time_keyboard: true,
                    keyboard: [
                      [
                        {
                          text: "Да",
                        },
                        {
                          text: "Нет",
                        },
                      ],
                    ],
                    resize_keyboard: true
                  },
                }
              );
            } else if (user.hasSales === null) {
              user.hasSales = msg.text === "Да";
              await bot.sendMessage(
                msg.from!.id,
                "Подскажите, в какую системы у вас пробрасываются лиды? (выберите или напишите свой вариант)",
                {
                  reply_markup: {
                    keyboard: [
                      [
                        {
                          text: "Bitrix24",
                        },
                      ],
                      [
                        {
                          text: "AmoCRM",
                        },
                      ],
                      [
                        {
                          text: "Нет системы",
                        },
                      ],
                    ],
                    resize_keyboard: true,
                    one_time_keyboard: true
                  },
                }
              );
            } else if (!user.mailerCrm) {
              user.mailerCrm = msg.text!;
              await bot.sendMessage(
                msg.from!.id,
                "Подскажите, текущую среднюю конверсию в продажу/договоренность из заявки?",
                {
                  reply_markup: {
                    keyboard: [
                      [
                        {
                          text: "Не знаю",
                        },
                      ],
                    ],
                    one_time_keyboard: true,
                    resize_keyboard: true
                  },
                }
              );
            } else if (!user.averageCR) {
              user.averageCR = msg.text!;
              await bot.sendMessage(
                msg.from!.id,
                "Укажите цель, к которой хотите прийти в результате сотрудничества и подробно опишите ее. (Цель может быть в деньгах / количестве лидов / CR в продажу / качество лидов …)"
              );
            } else if (!user.goal) {
              user.goal = msg.text!;
              await bot.sendMessage(msg.from!.id, "Отлично, зафиксировал!");
              await wait(1)
              await bot.sendMessage(
                msg.from!.id,
                "Я уже передал техническое задание нашим специалистам. В ближайшее время необходимо связаться для уточнения деталей.\nНапишите дату и время , удобную для звонка!"
              );
            } else if (!user.callTime) {
              user.callTime = msg.text!;
              await bot.sendMessage(msg.from!.id, "Ожидайте звонка))");
              await wait(1);
              await bot.sendMessage(msg.from!.id, "До скорых встреч");
              await bot.sendMessage(
                -1002242067427,
                `
                                    Юзер:
                                    Имя: ${user.name} (${msg.from?.username})
                                    Сфера: ${user.sphere}
                                    Сотрудники: ${user.employees}
                                    Оборот: ${user.cashflow}
                                    Оптимизировать: ${user.optimizing}
                                    Задача: ${user.task}
                                    Людей в отделе продаж: ${user.peopleInSales}
                                    Формат работы отдела: ${user.salesFormat}
                                    Поддержка в написании скриптов: ${user.scriptHelp}
                                    Система выгрузки ОП: ${user.salesStats}
                                    Ежемесячный V: ${user.monthlyV}
                                    Базы для диалога: ${user.hasBases}
                                    Подключен ОП: ${user.hasSales}
                                    Система для лидов: ${user.mailerCrm}
                                    Текущая конверсия: ${user.averageCR}
                                    Цель: ${user.goal}
                                    Есть ли канал: ${user.channelLink}
                                    Знаком ли с комментингом: ${user.knowsCommenting}
                                    Максимально подробная цель: ${user.finalGoal}
                                    Метрика ЕйчАр: ${user.hrMetrics}
                                    Был ли смм: ${user.hasSmm}
                                    Дата звонка: ${user.callTime}
                                `
              );
            }
          } else if (user.optimizing == "commenter") {
            if (!user.channelLink) {
              user.channelLink = msg.text!;
              await bot.sendMessage(
                msg.from!.id,
                "Знакомы ли вы со способом продвижения канала через связку «комментинг»?"
              );
            } else if (user.knowsCommenting === null) {
              user.knowsCommenting = msg.text === "Да";
              if (!user.knowsCommenting) {
                await bot.sendDocument(msg.from!.id, 'info.pdf');
              }
              await bot.sendMessage(
                msg.from!.id,
                "Подскажите, пожалуйста был ли опыт работы с SMM специалистом?",
                {
                  reply_markup: {
                    keyboard: [
                      [
                        {
                          text: 'Да, был'
                        }
                      ],
                      [
                        {
                          text: 'Нет, не было'
                        }
                      ]
                    ],
                    one_time_keyboard: true,
                    resize_keyboard: true
                  }
                }
              );
            } else if (!user.hasSmm) {
              user.hasSmm = msg.text!;
              await bot.sendMessage(
                msg.from!.id,
                "Укажите цель, к которой хотите прийти в результате сотрудничества и подробно опишите ее. (Цель может быть в деньгах / количестве лидов / CR в продажу / качество лидов …)"
              );
            } else if (!user.goal) {
              user.goal = msg.text!;
              await bot.sendMessage(msg.from!.id, "Отлично, зафиксировал!");
              await wait(1);
              await bot.sendMessage(
                msg.from!.id,
                "Для более конструктивной работы, я предлагаю созвониться. Познакомимся, заодно обсудим вашего будущего сотрудника. Подскажите, когда вам будет удобно? Для регистрации встречи, напишите удобное время и дату"
              );
            } else if (!user.callTime) {
              user.callTime = msg.text!;
              await bot.sendMessage(msg.from!.id, "Ожидайте звонка))");
              await wait(1);
              await bot.sendMessage(msg.from!.id, "До скорых встреч");
              await bot.sendMessage(
                -1002242067427,
                `
                                        Юзер:
                                        Имя: ${user.name} (${msg.from?.username})
                                        Сфера: ${user.sphere}
                                        Сотрудники: ${user.employees}
                                        Оборот: ${user.cashflow}
                                        Оптимизировать: ${user.optimizing}
                                        Задача: ${user.task}
                                        Людей в отделе продаж: ${user.peopleInSales}
                                        Формат работы отдела: ${user.salesFormat}
                                        Поддержка в написании скриптов: ${user.scriptHelp}
                                        Система выгрузки ОП: ${user.salesStats}
                                        Ежемесячный V: ${user.monthlyV}
                                        Базы для диалога: ${user.hasBases}
                                        Подключен ОП: ${user.hasSales}
                                        Система для лидов: ${user.mailerCrm}
                                        Текущая конверсия: ${user.averageCR}
                                        Цель: ${user.goal}
                                        Есть ли канал: ${user.channelLink}
                                        Знаком ли с комментингом: ${user.knowsCommenting}
                                        Максимально подробная цель: ${user.finalGoal}
                                        Метрика ЕйчАр: ${user.hrMetrics}
                                        Был ли смм: ${user.hasSmm}
                                        Дата звонка: ${user.callTime}
                                    `
              );
            }
          } else if (user.optimizing == "hr") {
            if (!user.finalGoal) {
              user.finalGoal = msg.text!;
              await bot.sendMessage(
                msg.from!.id,
                "Подключены ли HR специалисты в Ваш штат сотрудников (или желаете подключить)?"
              );
            } else if (!user.hasHr) {
              user.hasHr = msg.text!;
              await bot.sendMessage(
                msg.from!.id,
                "Какую метрику вы используете для контроля и управления кадрами?"
              );
            } else if (!user.hrMetrics) {
              user.hrMetrics = msg.text!;
              await bot.sendMessage(
                msg.from!.id,
                "Укажите цель, к которой хотите прийти в результате сотрудничества и подробно опишите ее. (Цель может быть в деньгах / количестве лидов / CR в продажу / качество лидов …)"
              );
            } else if (!user.goal) {
              user.goal = msg.text!;
              await bot.sendMessage(msg.from!.id, "Oтлично, зафиксировал!");
              await wait(1);
              await bot.sendMessage(
                msg.from!.id,
                "Для более конструктивной работы, я предлагаю созвониться. Познакомимся, заодно обсудим вашего будущего сотрудника. Подскажите, когда вам будет удобно? Для регистрации встречи, напишите удобное время и дату"
              );
            } else if (!user.callTime) {
              user.callTime = msg.text!;
              await bot.sendMessage(msg.from!.id, "Ожидайте звонка))");
              await wait(1);
              await bot.sendMessage(msg.from!.id, "До скорых встреч");
              await bot.sendMessage(
                -1002242067427,
                `
                        Юзер:
                        Имя: ${user.name} (${msg.from?.username})
                        Сфера: ${user.sphere}
                        Сотрудники: ${user.employees}
                        Оборот: ${user.cashflow}
                        Оптимизировать: ${user.optimizing}
                        Задача: ${user.task}
                        Людей в отделе продаж: ${user.peopleInSales}
                        Формат работы отдела: ${user.salesFormat}
                        Поддержка в написании скриптов: ${user.scriptHelp}
                        Система выгрузки ОП: ${user.salesStats}
                        Ежемесячный V: ${user.monthlyV}
                        Базы для диалога: ${user.hasBases}
                        Подключен ОП: ${user.hasSales}
                        Система для лидов: ${user.mailerCrm}
                        Текущая конверсия: ${user.averageCR}
                        Цель: ${user.goal}
                        Есть ли канал: ${user.channelLink}
                        Знаком ли с комментингом: ${user.knowsCommenting}
                        Максимально подробная цель: ${user.finalGoal}
                        Метрика ЕйчАр: ${user.hrMetrics}
                        Был ли смм: ${user.hasSmm}
                        Дата звонка: ${user.callTime}
                `
              );
            }
          }
        }
        await userRepo.save(user);
      }
    }
  });

  bot.on("callback_query", async (q) => {
    const user = await userRepo.findOne({
      where: {
        chatId: String(q.from.id),
      },
    });
    if (!user) return;
    //@ts-ignore
    user.optimizing = q.data;
    await userRepo.save(user);
    if (user.optimizing != "other") {
      let keyboard: TgBot.KeyboardButton[][] = [];
      switch (user.optimizing) {
        case "sales":
          keyboard = [
            [
              {
                text: "Увеличение конверсии (CR) в продажу",
              },
            ],
            [
              {
                text: "Отслеживание эффективности сотрудника",
              },
            ],
            [
              {
                text: "Контроль выполнения плана продаж",
              },
            ],
          ];
          break;
        case "mailer":
          keyboard = [
            [
              {
                text: "Лидогенерация (продажа продуктов)",
              },
            ],
            [
              {
                text: "Лидогенерация (привлечение инвестиций)",
              },
            ],
            [
              {
                text: "Лидогенерация (поиск партнеров)",
              },
            ],
          ];
          break;
        case "commenter":
          keyboard = [
            [
              {
                text: "Набор подписчиков в ТГ канал",
              },
            ],
            [
              {
                text: "Набор подписчиков в канал ВК",
              },
            ],
          ];
          break;
        case "hr":
          keyboard = [
            [
              {
                text: "Поиск кадров",
              },
            ],
            [
              {
                text: "Квалификация кадров",
              },
            ],
            [
              {
                text: "Управление персоналом",
              },
            ],
          ];
          break;
      }
      await bot.sendMessage(
        q.from.id,
        "Какую задачу в данном сегменте вы бы хотели решить с помощью ИИ? (Выберите из списка или укажите другую)",
        {
          reply_markup: {
            keyboard,
            one_time_keyboard: true,
            resize_keyboard: true
          },
        }
      );
    }
  });
});
