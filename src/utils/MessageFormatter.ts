import fs from "fs";
import TelegramBot, {
	SendDocumentOptions,
	SendMessageOptions,
	SendPhotoOptions,
} from "node-telegram-bot-api";
import path from "path";
import { TelegramClient } from "telegram";

export class MessageFormatter {
	public static readTextFromFile(file: string): string {
		return fs.readFileSync(
			path.join(process.cwd(), "assets", file),
			"utf8",
		);
	}

	public static async sendTextFromFile(
		user: string,
		file: string,
		client: TelegramClient,
	) {
		const data = this.readTextFromFile(file);
		await client.sendMessage(user, {
			message: data,
		});
	}

	public static async sendTextFromFileBot(
		bot: TelegramBot,
		file: string,
		user: number,
		opts?: SendMessageOptions,
	) {
		const data = this.readTextFromFile(file);
		await bot.sendMessage(user, data, opts);
	}

	public static async sendImageFromFileBot(
		file: string,
		bot: TelegramBot,
		user: number,
		caption: string,
		opts?: SendPhotoOptions,
	) {
		const buffer = fs.readFileSync(
			path.join(process.cwd(), "assets", file),
		);

		await bot.sendPhoto(
			user,
			buffer,
			{
				caption: caption,
				...opts,
			},
			{},
		);
	}

	public static async sendDocumentBot(
		file: string,
		bot: TelegramBot,
		user: number,
		opts?: SendDocumentOptions,
	) {
		const buffer = fs.readFileSync(
			path.join(process.cwd(), "assets", file),
		);
		await bot.sendDocument(user, buffer, opts);
	}
}
