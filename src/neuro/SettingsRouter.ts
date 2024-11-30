import TelegramBot from "node-telegram-bot-api";
import { Router } from "./router";
import { User } from "../entity/User";
import { bot } from ".";

export class SettingsRouter extends Router {
	constructor() {
		super();

		this.onCallback = this.onCallback.bind(this);
		this.onText = this.onText.bind(this);
	}

	public async onCallback(q: TelegramBot.CallbackQuery) {
		if (q.data === "change-name") {
			const user = await Router.manager.findOneBy(User, {
				chatId: String(q.from.id),
			});
			if (!user) return;
			user.waitingForName = true;
			await Router.manager.save(user);
			await bot.sendMessage(
				q.from.id,
				"Пришлите мне ваше имя. Я буду обращаться к вам по этому имени! 😊",
			);
		}
		if (q.data === "toggle-count") {
			const user = await Router.manager.findOneBy(User, {
				chatId: String(q.from.id),
			});
			if (!user) return;
			user.countTokens = !user.countTokens;
			await Router.manager.save(user);
			await bot.sendMessage(q.from.id, "Подсчет токенов изменен", {
				reply_markup: {
					inline_keyboard: [
						[
							{
								text: "Назад",
								callback_data: "change-count",
							},
						],
					],
				},
			});
		}

		if (q.data === "change-count") {
			const user = await Router.manager.findOneBy(User, {
				chatId: String(q.from.id),
			});
			if (!user) return;
			await bot.sendMessage(
				q.from.id,
				`📊 Подсчёт токенов — это полезная функция, которая позволяет вам отслеживать, сколько токенов вы тратите на взаимодействие с нейросетью. В подсчёте токенов учитывается ваш запрос, ответ и контекст общения (память). 
  
  Вот как это работает:
  
  ✅ Включить - Вы будете видеть количество потраченных токенов после каждого ответа и сможете понимать свой расход токенов в диалоге на текущий момент. 
  
  ✖️ Отключить - Вы не будете видеть количество потраченных токенов после каждого ответа. Это может быть полезно для тех, кто предпочитает более чистый интерфейс или не хочет отвлекаться на подсчёт токенов во время общения.
  `,
				{
					reply_markup: {
						inline_keyboard: [
							[
								{
									text: user.countTokens
										? "✖️ Отключить"
										: "✅ Включить",
									callback_data: "toggle-count",
								},
							],
							[
								{
									text: "Назад",
									callback_data: "settings",
								},
							],
						],
					},
				},
			);
		}

		if (q.data?.startsWith("model-")) {
			const model = q.data.substring(6);
			const user = await Router.manager.findOneBy(User, {
				chatId: String(q.from.id),
			});
			if (!user) return;
			//@ts-ignore
			user.model = model;
			await Router.manager.save(user);
			await bot.sendMessage(q.from.id, "Модель успешно изменена", {
				reply_markup: {
					inline_keyboard: [
						[
							{
								text: "Назад",
								callback_data: "settings",
							},
						],
					],
				},
			});
		}

		if (q.data === "change-model") {
			await bot.sendMessage(q.from.id, "Выберите модель", {
				reply_markup: {
					inline_keyboard: [
						[
							{
								text: "GPT 4 Omni mini",
								callback_data: "model-gpt-4o-mini",
							},
						],
						[
							{
								text: "GPT 4 Omni",
								callback_data: "model-gpt-4o",
							},
						],
						[
							{
								text: "GPT 4 Turbo",
								callback_data: "model-gpt-4-turbo",
							},
						],
						[
							{
								text: "Назад",
								callback_data: "settings",
							},
						],
					],
				},
			});
		}
	}

	public async onText(msg: TelegramBot.Message, u: User): Promise<boolean> {
		if (u.waitingForName) {
			u.name = msg.text!;
			u.waitingForName = false;
			await Router.manager.save(u);
			await bot.sendMessage(msg.from!.id, "Имя изменено", {
				reply_markup: {
					inline_keyboard: [
						[
							{
								text: "Назад",
								callback_data: "settings",
							},
						],
					],
				},
			});
			return true;
		}
		return false;
	}
}
