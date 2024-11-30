import TelegramBot from "node-telegram-bot-api";
import { MessageFormatter } from "../utils/MessageFormatter";
import { AppDataSource } from "../data-source";
import { SupportRequest } from "../entity/SupportRequest";

const bot = new TelegramBot(process.env.SUPPORT_TOKEN ?? "", { polling: true });
AppDataSource.initialize();

const repo = AppDataSource.getRepository(SupportRequest);

bot.onText(/\/start/, async (msg) => {
	await repo
		.createQueryBuilder("request")
		.delete()
		.where("request.userId = :id", { id: String(msg.from!.id) })
		.andWhere("request.isInProgress = true")
		.execute();
	await MessageFormatter.sendTextFromFileBot(
		bot,
		"suport-start.txt",
		msg.from!.id,
		{
			reply_markup: {
				inline_keyboard: [
					[
						{
							text: "Вопрос по готовым AI решениям",
							callback_data: "q",
						},
					],
					[
						{
							text: "Вопрос по нейро-сотрудникам",
							callback_data: "q",
						},
					],
					[
						{
							text: "Предложения и обратная связь",
							callback_data: "a",
						},
					],
					[
						{
							text: "оставить отзыв",
							callback_data: "f",
						},
					],
				],
			},
		},
	);
});

bot.on("callback_query", async (q) => {
	const m: Map<string, "question" | "advice" | "feedback"> = new Map([
		["q", "question"],
		["a", "advice"],
		["f", "feedback"],
	]);
	const req = new SupportRequest();
	req.type = m.get(q.data!) ?? "question";
	req.userId = String(q.from.id);
	await repo.save(req);
	let msg = "";

	switch (q.data) {
		case "q":
			msg = "Задайте развернутый вопрос или опишите проблему";
			break;
		case "a":
			msg =
				"Если у вас есть предложения, касательно того, как сделать наш сервис еще лучше, то развернуто опишете ваше предложение. Обещаем учесть все замечания!";
			break;
		default:
			msg =
				"Поделитесь своими впечатлениями от взаимодействия со SmartComrade и получите бесплатные токены в подарок. Оставьте отзыв ниже, в этом чате. После обработки модерации вам будут начислены подарочные токены.";
			break;
	}

	await bot.sendMessage(q.from.id, msg);
});

bot.onText(/./, async (msg) => {
	if (!msg.text?.startsWith("/")) {
		const req = await repo
			.createQueryBuilder("request")
			.where("request.userId = :id", {
				id: String(msg.from!.id),
			})
			.andWhere("request.isInProgress = true")
			.getOne();
		if (!req) return;
		req.isInProgress = false;
		await repo.save(req);
		let message: string;
		switch (req.type) {
			case "question":
				message =
					"Понял, вас! Специалист подключиться в диалог в ближайшее время";
				break;
			case "advice":
				message =
					"Спасибо за ваш ответ! Свяжемся с вами в ближайшее время";
				break;
			default:
				message =
					"Спасибо за ваш отзыв. Постараемся начислить вам токены в ближайшее время";
				break;
		}
		await bot.sendMessage(msg.from!.id, message);
	}
});
