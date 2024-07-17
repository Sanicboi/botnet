import fs from 'fs';
import path from 'path';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import input from 'input';
import { DataSource } from 'typeorm';
import { User } from './src/entity/User';
import { Bot } from './src/entity/Bot';
import { Message } from './src/entity/Message';
import { Thread } from './src/entity/Thread';
import { Chat } from './src/entity/Chat';


const src = new DataSource({
    type: "postgres",
    username: "test",
    password: "test",
    database: "test",
    host: "194.0.194.46",
    entities: [User, Bot, Message, Thread, Chat],
    port: 5432,
    synchronize: false,
    migrations: [],
    subscribers: [],
  });
  src.initialize().then(async () => {
    const numbers = fs.readFileSync(path.join(__dirname, 'signup', 'numbers.txt'), 'utf8').split('\n').map(el => el.replace('\r', ''));
    console.log(numbers);
    const bots = await src.getRepository(Bot)
        .createQueryBuilder('bot')
        .select()
        .where('phone NOT IN (:...ids)', {
            ids: numbers
        })
        .andWhere('blocked = false')
        .limit(70)
        .getMany();
    const nums = bots.map(el => el.phone);
    fs.writeFileSync(path.join(__dirname, 'nums.txt'), nums.join('\n'));
  });