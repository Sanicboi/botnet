import { AppDataSource } from "../data-source";
import { Dialog } from "../entity/assistants/Dialog";
import { User, UserDataTypeMapped } from "../entity/User";
import { Agent } from "./Agent";
import { BalanceController } from "./BalanceController";
import { Bot } from "./Bot";
import { DialogController } from "./DialogController";
import { OutputController } from "./OutputController";
import { ImageAgent } from "./specialAgents/ImageAgent";
import { AudioAgent } from "./specialAgents/AudioAgent";
import { Transcription } from "./Transcription";
import { Converter } from "./Converter";
import { AgentGroup } from "../entity/assistants/AgentGroup";
import { InlineKeyboardButton } from "node-telegram-bot-api";
import { Btn } from "./utils";
import { CopyWriterAgent } from "./specialAgents/CopyWriterAgent";
import { OfferAgent } from "./specialAgents/OfferAgent";
import { PostAgent } from "./specialAgents/PostAgent";
import { AgentModel } from "../entity/assistants/AgentModel";
import { DataController } from "./DataController";

const manager = AppDataSource.manager;

/**
 * This class is responsible for all agent-specific controls of the telegram bot.
 * - This class DOES work with the database and IS RESPONSIBLE for handling models and the user`s interaction with them
 * - This class DOES NOT HANDLE user balance and token conversion, but it does count tokens from responses
 * - This class DOES NOT HANDLE conversations, only consumes the classes that handle it
 */
export class AgentController {
  private imageAgent: ImageAgent;
  private audioAgent: AudioAgent;
  private copyWriter: CopyWriterAgent;
  private offerAgent: OfferAgent;
  private postAgent: PostAgent;

  /**
   * Sets the listeners for the bot
   * @param bot Telegram Bot
   */
  constructor(
    private bot: Bot,
    private balanceController: BalanceController,
    private dialogController: DialogController,
    private outputController: OutputController,
    private dataController: DataController,
  ) {
    this.imageAgent = new ImageAgent(bot, dataController);
    this.audioAgent = new AudioAgent(
      bot,
      outputController,
      balanceController,
      dataController,
    );
    this.copyWriter = new CopyWriterAgent(
      bot,
      this.dialogController,
      dataController,
    );
    this.postAgent = new PostAgent(
      bot,
      this.dialogController,
      this.dataController,
    );
    this.offerAgent = new OfferAgent(
      bot,
      dialogController,
      this.dataController,
    );
    this.bot.onTextInput(this.textInput.bind(this));
    this.bot.onVoiceInput(this.voiceInput.bind(this));
    this.bot.onDocInput(this.docInput.bind(this));
    this.bot.onImageInput(this.imageInput.bind(this));
    this.bot.onGroups(this.groups.bind(this));
    this.bot.onGroups2(this.groups2.bind(this));
    this.bot.onAgents(this.agents.bind(this));
    this.bot.onDataInput(this.dataInput.bind(this));
  }

  private async textInput(user: User, text: string) {
    const result = await this.balanceController.checkBalance(user);
    if (!result.exists) return;
    const agent = new Agent(user.agent!);

    let dialog: Dialog = this.dialogController.getUserCurrentDialog(user);
    if (!dialog.firstMessage) {
      dialog.firstMessage = text;
    }
    dialog.msgCount += 2;
    await manager.save(dialog);
    await this.bot.bot.sendMessage(+user.chatId, 'Генерирую ответ...')
    const response = await agent.run(
      {
        maxTokens: result.limit,
        type: "text",
        value: text,
        previousResponseId: dialog.lastMsgId ?? undefined,
      },
      user.model,
    );

    await this.balanceController.editBalance(
      user,
      response.usage!.total_tokens,
    );
    await this.dialogController.updateDialogLastMsg(dialog, response.id);
    const converted = await this.outputController.convert(
      response.output_text,
      user.outputFormat,
    );
    await this.outputController.send(converted, user);
    await this.outputController.sendTokenCount(
      user,
      response.usage!.total_tokens,
    );
  }

  private async voiceInput(user: User, url: string) {
    await this.bot.bot.sendMessage(+user.chatId, 'Генерирую ответ...')
    const transcription = new Transcription(false, url);
    await transcription.setup();
    const costs = await transcription.getCost();
    let check = await this.balanceController.checkBalance(user, costs);
    if (!check.exists) return;

    await this.balanceController.editBalance(
      user,
      Converter.SMTTK(costs, user.model),
    );
    check = await this.balanceController.checkBalance(user);
    const agent = new Agent(user.agent!);
    let dialog: Dialog = this.dialogController.getUserCurrentDialog(user);
    if (!dialog.firstMessage) {
      dialog.firstMessage = 'Голосовое сообщение';
    }
    dialog.msgCount += 2;
    await manager.save(dialog);
    const response = await agent.run(
      {
        maxTokens: check.limit,
        type: "voice",
        transcription: transcription,
        value: "",
        caption: "",
        previousResponseId: dialog.lastMsgId ?? undefined,
      },
      user.model,
    );
    await this.dialogController.updateDialogLastMsg(dialog, response.id);

    await this.balanceController.editBalance(
      user,
      response.usage!.total_tokens,
    );
    const converted = await this.outputController.convert(
      response.output_text,
      user.outputFormat,
    );
    await this.outputController.send(converted, user);
    await this.outputController.sendTokenCount(
      user,
      response.usage!.total_tokens,
    );
  }

  private async docInput(user: User, url: string, caption?: string) {
    await this.bot.bot.sendMessage(+user.chatId, 'Генерирую ответ...')
    const result = await this.balanceController.checkBalance(user);
    if (!result.exists) return;
    const agent = new Agent(user.agent!);

    let dialog: Dialog = this.dialogController.getUserCurrentDialog(user);
    if (!dialog.firstMessage) {
      dialog.firstMessage = 'Документ';
    }
    dialog.msgCount += 2;
    await manager.save(dialog);
    const response = await agent.run(
      {
        maxTokens: result.limit,
        type: "document",
        value: url,
        dialogId: dialog.id,
        previousResponseId: dialog.lastMsgId ?? undefined,
        userId: user.chatId,
        caption,
      },
      user.model,
    );

    await this.balanceController.editBalance(
      user,
      response.usage!.total_tokens,
    );
    await this.dialogController.updateDialogLastMsg(dialog, response.id);
    const converted = await this.outputController.convert(
      response.output_text,
      user.outputFormat,
    );
    await this.outputController.send(converted, user);
    await this.outputController.sendTokenCount(
      user,
      response.usage!.total_tokens,
    );
  }

  private async imageInput(user: User, url: string, caption?: string) {
    await this.bot.bot.sendMessage(+user.chatId, 'Генерирую ответ...')
    const result = await this.balanceController.checkBalance(user);
    if (!result.exists) return;
    const agent = new Agent(user.agent!);

    let dialog: Dialog = this.dialogController.getUserCurrentDialog(user);
    if (!dialog.firstMessage) {
      dialog.firstMessage = 'Изображение';
    }
    dialog.msgCount += 2;
    await manager.save(dialog);
    const response = await agent.run(
      {
        maxTokens: result.limit,
        type: "image",
        value: url,
        previousResponseId: dialog.lastMsgId ?? undefined,
        caption,
      },
      user.model,
    );

    await this.balanceController.editBalance(
      user,
      response.usage!.total_tokens,
    );
    await this.dialogController.updateDialogLastMsg(dialog, response.id);
    const converted = await this.outputController.convert(
      response.output_text,
      user.outputFormat,
    );
    await this.outputController.send(converted, user);
    await this.outputController.sendTokenCount(
      user,
      response.usage!.total_tokens,
    );
  }

  private async dataInput(user: User, type: string) {
    user.dialogueData = user[(type + "Data") as UserDataTypeMapped];
    await manager.save(user);
    await this.bot.bot.sendMessage(
      +user.chatId,
      "Данные взяты");
  }

  private async groups(user: User) {
    const groups = await manager.find(AgentGroup, {
      take: 8,
      order: {
        name: "ASC",
      },
    });
    let result: InlineKeyboardButton[][] = [];
    result.push(Btn("🤖Свободный режим", "agent-4"));
    result.push(Btn("🖼️Дизайн и генерация картинок", "images"));
    for (const group of groups) {
      result.push(Btn(group.name, `group-${group.id}`));
    }
    result.push(Btn("Следующая страница", "groups-2"));
    await this.bot.bot.sendMessage(
      +user.chatId,
      "Выберите категорию сотрудников",
      {
        reply_markup: {
          inline_keyboard: result,
        },
      },
    );
  }

  private async groups2(user: User) {
    const groups = await manager.find(AgentGroup, {
      skip: 8,
      order: {
        name: "ASC",
      },
    });
    let result: InlineKeyboardButton[][] = [];
    for (const group of groups) {
      result.push(Btn(group.name, `group-${group.id}`));
    }
    result.push(Btn("Предыдущая страница", "groups-1"));
    await this.bot.bot.sendMessage(
      +user.chatId,
      "Выберите категорию сотрудников",
      {
        reply_markup: {
          inline_keyboard: result,
        },
      },
    );
  }

  private async agents(user: User, group: string) {
    const agents = await manager.find(AgentModel, {
      where: {
        groupId: +group,
      },
      order: {
        name: "ASC",
      },
    });
    let result: InlineKeyboardButton[][] = [];
    for (const agent of agents) {
      result.push(Btn(agent.name, `agent-${agent.id}`));
    }
    if (+group === 6) {
      result.push(Btn("Транскрибатор аудио", "audio"));
      result.push(Btn("Суммаризатор аудио", "audiosum"));
    }
    result.push(Btn('Назад', 'groups'));
    await this.bot.bot.sendMessage(+user.chatId, "Выберите сотрудника", {
      reply_markup: {
        inline_keyboard: result,
      },
    });
  }
}
