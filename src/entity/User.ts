import {
	Column,
	Entity,
	JoinColumn,
	ManyToOne,
	OneToMany,
	OneToOne,
	PrimaryColumn,
} from "typeorm";
import { Thread } from "./assistants/Thread";
import { Action } from "./assistants/Action";
import OpenAI from "openai";
import { FileUpload } from "./assistants/FileUpload";

@Entity()
export class User {
	@PrimaryColumn()
	chatId: string;

	@Column({ nullable: true })
	sphere: string;

	@Column({ nullable: true })
	leads: string;

	@Column({ nullable: true })
	callDate: string;

	@Column({ nullable: true })
	optimize: string;

	@Column({ default: "n" })
	qt: "n" | "s" | "l" | "d" | "a" | "o";

	@OneToMany(() => Thread, (thread) => thread.user)
	threads: Thread[];

	@ManyToOne(() => Action)
	@JoinColumn({
		name: "actionId",
	})
	action: Action;

	@Column({
		nullable: true,
	})
	actionId: string;

	@Column({
		default: false,
	})
	usingImageGeneration: boolean;

	@Column({
		default: "1024x1024",
	})
	imageRes: "1024x1024" | "1024x1792" | "1792x1024";

	@Column({
		default: "gpt-4o-mini",
	})
	model: OpenAI.ChatModel;

	@Column({
		default: "none",
	})
	subscription: "none" | "lite" | "pro" | "premium" | "exlusive";

	@Column({
		nullable: true,
	})
	endDate?: Date;

	@Column("float", {
		default: 0,
	})
	addBalance: number; // additional balance in Rubles

	@Column("float", {
		default: 0,
	})
	leftForToday: number; // subscription Rubles left for today

	@Column({
		default: "",
	})
	name: string;

	@Column({
		default: false,
	})
	countTokens: boolean;

	@Column({
		default: false,
	})
	waitingForName: boolean;

	@OneToMany(() => FileUpload, (f) => f.user)
	files: FileUpload[];

	@Column({
		default: "",
	})
	offerSize: string;

	@Column({
		default: "",
	})
	textStyle: string;

	@Column({
		default: "",
	})
	textTone: string;

	@Column({
		default: "",
	})
	docType: string;

	@Column({
		default: "",
	})
	agreementType: string;
}
