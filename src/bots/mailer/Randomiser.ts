import { openAi } from "../..";

export class Randomiser {
  public static async randomise(
    message: string,
    name: string,
  ): Promise<string> {
    const res = await openAi.chat.completions.create({
      messages: [
        {
          role: "user",
          content: `ТЕБЯ ЗОВУТ ${name}. Если у тебя женское имя, напиши от него. Перепиши синонимично это сообщение, заменив 15 слов синонимами, но сохранив мысль: ${message}`,
        },
      ],
      model: "gpt-4o-mini",
      temperature: 1,
    });
    return res.choices[0].message.content!;
  }
}
