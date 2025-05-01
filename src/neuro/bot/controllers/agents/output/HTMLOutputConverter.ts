import { Conversation } from "../../../../../entity/Conversation";
import { User } from "../../../../../entity/User";
import { api } from "../../../../apis/API";


/**
 * Конвертер текста в хтмл через гпт
 */
export class HTMLOutputConverter {
    

    /**
     * Пустой конструктор
     */
    constructor() {

    }


    /**
     * Конвертация
     * @param conversation Диалог
     * @param user пользователь
     * @returns результат конвертации (строка)
     */
    public async convert(conversation: Conversation, user: User): Promise<string> {
        const res = await api.run({
            api: 'openai',
            input: 'Преобразуй весь предыдущий диалог в отчет HTML (UTF-8). Сделай сайт красивым и созрани всю информацию.',
            model: 'gpt-4o-mini',
            type: 'text',
            user: user,
            instructions: 'Ты - профессиональный HTML верстальщик',
            conversation,
            store: false
        });
        return res.content.replaceAll('```html', '').replaceAll('```', '');
    }
}