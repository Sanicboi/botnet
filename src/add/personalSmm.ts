import { StringSession } from "telegram/sessions";
import { AppDataSource } from "../data-source";
import { Api, TelegramClient } from "telegram";
import { NewMessage, NewMessageEvent } from "telegram/events";
import { Channel } from "../entity/bots/Channel";
import { Post } from "../entity/bots/Post";
import cron from 'node-cron';
import OpenAI from "openai";
import {z} from 'zod';
import {zodResponseFormat} from 'openai/helpers/zod'
import dayjs from "dayjs";
import TelegramBot, { InlineKeyboardButton } from "node-telegram-bot-api";
const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY
})

let adding = false;
let editing = false;
let editingOther = false;
let creatingNew = false;
let currentPost: Post | null = null;
let currentPostText: string = "";
AppDataSource.initialize().then(async () => {
    const manager = AppDataSource.manager;
    const session = new StringSession(process.env.PERSONAL_SMM_CLIENT_TOKEN);
    const client = new TelegramClient(session, Number(process.env.TG_API_ID!), process.env.TG_API_HASH!, {
        useWSS: true
    });

    const bot = new TelegramBot(process.env.PERSONAL_SMM_BOT_TOKEN!, {
        polling: true
    });

    await client.connect();

    client.addEventHandler(async (e: NewMessageEvent) => {
        if (e.isChannel && e.message.sender?.className === "Channel") {
            const channel = await manager.findOne(Channel, {
                where: {
                    username: e.message.sender.username
                }
            });
            if (!channel) return;

            const p = new Post();
            p.channel = channel;
            p.channelId = channel.username;
            p.postId = e.message.id.toString();

            const digest = z.object({
                topic: z.string()
            });

            const completion = await openai.beta.chat.completions.parse({
                messages: [
                    {
                        role: 'system',
                        content: 'Прочитай данный тебе пост и найди его тему'
                    },
                    {
                        role: 'user',
                        content: e.message.text
                    }
                ],
                model: 'gpt-4o-mini',
                response_format: zodResponseFormat(digest, "topic")
            });
            p.topic = completion.choices[0].message.parsed!.topic!;
            p.text = e.message.text;
            await manager.save(p);
        }
    }, new NewMessage());

    cron.schedule('0 20 * * *', async () => {
        const channels = await manager
        .getRepository(Channel)
        .createQueryBuilder("channel")
        .select()
        .leftJoinAndSelect("channel.posts", "post")
        .where("post.createdAt > :d", {
            d: dayjs().subtract(1, "day").toDate()
        })
        .getMany();
        let buttons: InlineKeyboardButton[][] = [];
        let result = `Отчет за ${dayjs().toDate().toLocaleDateString('ru', {timeZone: 'Europe/Moscow',})}\n\n`;
        for (const channel of channels) {
            result += `Канал ${channel.username}:\n`;
            for (const post of channel.posts) {
                result += `Пост №${post.id}\n`;
                result += `Тема поста: ${post.topic}\n`;
                result += `Ссылка на пост: https://t.me/${channel.username}/${post.postId}\n`
                result += '\n';
                buttons.push([{
                    text: `Пост №${post.id}`,
                    callback_data: `improve-${post.id}`,
                }]);
            }
            result += '\n\n';
        }

        result += 'Какой пост улучшим?';
              
        await bot.sendMessage(1292900617, result, {
            reply_markup: {
                inline_keyboard: buttons
            }
        });

    })

    bot.on('callback_query', async q => {
        if (q.data?.startsWith('improve-')) {
            const id = q.data.split('-')[1];
            const p = await manager.findOne(Post, {
                where: {
                    id: Number(id)
                }
            });
            if (!p) return;
            const response = await openai.chat.completions.create({
                messages: [
                    {
                        role: 'system',
                        content: 'Ты - специалист по улучшению постов. Тебе будет дан пост. Улучши его и пришли пользователю.'
                    },
                    {
                        role: 'assistant',
                        content: p.text
                    }
                ],
                model: 'gpt-4o-mini'
            });
            editing = true;
            currentPost = p;
            await bot.sendMessage(q.from.id, response.choices[0].message.content!);
        }

        if (q.data?.startsWith('delete-')) {
            const id = q.data.substring(7);
            await manager
            .getRepository(Channel)
            .createQueryBuilder('channel')
            .delete()
            .where('channel.username = :id', {
                id
            })
            .execute();
            await client.invoke(new Api.channels.LeaveChannel({
                channel: id
            }));
            await bot.sendMessage(q.from.id, 'Канал удален');
        }
        
        if (q.data === 'add') {
            adding = true;
            await bot.sendMessage(q.from.id, 'Пришлите ник канала (ТОЛЬКО НИК, БЕЗ @ ИЛИ ССЫЛКИ)');
        }

        if (q.data === 'finish') {
            editing = false;
            currentPost = null;
        }

        if (q.data == "terminate") {
            editingOther = false;
            currentPostText = "";
        }
    });

    bot.onText(/\/list/, async (msg) => {
        const channels = await manager.find(Channel);
        const r = channels.reduce((accumulator, current) => accumulator + `${current.username}\n`, '');
        const m: InlineKeyboardButton[][] = channels.map(el => [{
            text: `Удалить ${el.username}`,
            callback_data: `delete-${el.username}`
        }]);
        m.push([{
            text: `Добавить канал`,
            callback_data: 'add'
        }])
        await bot.sendMessage(msg.from!.id, `Список каналов: ${r}\n`, {
            reply_markup: {
                inline_keyboard: m
            }
        });
    });

    bot.onText(/./, async (msg) => {
        if (adding) {
            const c = new Channel();
            c.username = msg.text!;
            await manager.save(c);
            adding = false;
            await client.invoke(new Api.channels.JoinChannel({
                channel: c.username
            }))
            await bot.sendMessage(msg.from!.id, `Канал сохранен`);
        }

        if (editing && currentPost) {
            const res = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        content: 'Улучши данный тебе пост на основе корректировок',
                        role: 'system'
                    },
                    {
                        content: `Пост:\n${currentPost.text}`,
                        role: 'system'
                    },
                    {
                        content: msg.text!,
                        role: 'user'
                    }
                ]
            });

            currentPost.text = res.choices[0].message.content!;
            await manager.save(currentPost);

            await bot.sendMessage(msg.from!.id, currentPost.text, {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: 'Закончить',
                                callback_data: 'finish'
                            }
                        ]
                    ]
                }
            })
        }

        if (creatingNew) {
            const res = await openai.chat.completions.create({
                messages: [
                    {
                        content: "You are a professional post writer. Write a post based on the given data. THE POST SHOULD BE IN RUSSIAN!",
                        role: "system"
                    }, 
                    {
                        role: "user",
                        content: msg.text!
                    }
                ],
                model: "gpt-4o-mini"
            });
            currentPostText = res.choices[0].message.content!;
            await bot.sendMessage(msg.from!.id, currentPostText);
            creatingNew = false;
            editingOther = true;
        }

        if (editingOther) {
            const res = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        content: "You are a professional post writer. Edit a post based on the given data. THE POST SHOULD BE IN RUSSIAN!",
                        role: "system"
                    }, 
                    {
                        content: `Post: ${currentPostText}`,
                        role: "system"
                    },
                    {
                        role: "user",
                        content: msg.text!
                    }
                ],
            });
            currentPostText = res.choices[0].message.content!;
            await bot.sendMessage(msg.from!.id, currentPostText, {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "Finish",
                                callback_data: "terminate"
                            }
                        ]
                    ]
                }
            })
        }
    });


    bot.onText(/\/generate/, async (msg) => {
        creatingNew = true;
        await bot.sendMessage(msg.from!.id, "The bot is waiting for the prompt");
    })
})