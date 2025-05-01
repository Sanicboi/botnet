import TelegramBot, { CallbackQuery, Message } from "node-telegram-bot-api";
import { User } from "../entity/User";
import { AppDataSource } from "../data-source";
import { FindOptionsRelations, RelationOptions } from "typeorm";
import cron from "node-cron";
import { wait } from "../utils/wait";
import { Converter } from "./bot/controllers/balance/Converter";

const specialIds: number[] = [1, 2, 3];

const manager = AppDataSource.manager;



export class Bot {
  public readonly bot: TelegramBot;

  private cqListeners: ((
    q: CallbackQuery,
    user: User,
  ) => Promise<true | any>)[] = [];
  private freeTextListeners: ((
    msg: Message,
    user: User,
  ) => Promise<true | any>)[] = [];
  private voiceListeners: ((
    msg: Message,
    user: User,
  ) => Promise<true | any>)[] = [];

  constructor() {
    this.bot = new TelegramBot(process.env.NEURO_TOKEN ?? "", {
      polling: true,
    });
    this.bot.setMyCommands([
      {
        command: "about",
        description: "🤝О нас (SmartComrade)",
      },
      {
        command: "help",
        description: "🤖О боте (справка)",
      },
      {
        command: "neuro",
        description: "🧠Нейро-сотрудники",
      },
      {
        command: "data",
        description: "📝Данные обо мне",
      },
      {
        command: "balance",
        description: "💳Баланс & подписка",
      },
      {
        command: "dialogs",
        description: "✉️Диалоги",
      },

      {
        command: "settings",
        description: "⚙️Настройки",
      },
      {
        command: "free",
        description: "🎁Бесплатные токены",
      },
      {
        command: "ref",
        description: "🏅Реферальная программа",
      },
      {
        command: "terms",
        description: "📜Условия использования & политика",
      },
    ]);

    this.bot.onText(/\/start/, async (msg) => {
      await this.getUser(msg);
      await this.bot.sendMessage(
        msg.from!.id,
        "Приветствую, дорогой друг!👋\n\nSmartComrade - это многофункциональная платформа с обученными нейро-сотрудниками разных направлений!\nЗдесь мы объединили лучшее из мира нейро-сетей в одном месте.\n\nСделай свою коммуникацию с нейро-сетями профессиональной вместе с нами)\n\nИ да, не нужны никакие зарубежные карты!))\n\nНе забудь забрать афигенные полезные материалы по нейро-сетям в нашем боте помощнике! @SC_NewsBot\nА также, будем рады видеть тебя в нашем канале: https://t.me/SmartComrade1",
      );
    });
  }

  public async addCQListener(listener: (q: CallbackQuery, user: User) => Promise<any>) {
    this.cqListeners.push(listener);
  }

  public async addFreeTextListener(listener: (msg: Message) => Promise<true | any>) {
    this.freeTextListeners.push(listener);
  }

  public async getUser(
    qOrMsg: {
      from?: {
        id: number;
      };
      text?: string;
    },
    relations: FindOptionsRelations<User> = {
      agent: true,
      dialogs: {
        agent: {
          group: true,
        },
      },
    },
  ): Promise<User> {
    console.log(String(qOrMsg.from!.id));
    let user = await manager.findOne(User, {
      where: {
        chatId: String(qOrMsg.from!.id),
      },
      relations,
    });
    if (!user) {
      if (!qOrMsg.text) throw new Error("User not found");
      user = new User();
      user.chatId = String(qOrMsg.from!.id);
      const referralId = qOrMsg.text.split(" ")[1];
      if (referralId) {
        const creator = await manager.findOne(User, {
          where: {
            chatId: referralId,
          },
        });
        if (creator) {
          if (creator.inviteCount <= 29) {
            creator.inviteCount++;
            creator.addBalance += Converter.SMTRUB(7000);
            await manager.save(creator);
          }
        }
      }
      await manager.save(user);
    }
    return user;
  }

  public onDialogs(f: (user: User) => Promise<any>) {
    this.bot.onText(/\/dialogs/, async (msg) => {
      const user = await this.getUser(msg, {
        dialogs: {
          agent: {
            group: true,
          },
        },
      });
      if (!user) return;
      await f(user);
    });
  }

  public onCreateDialog(f: (user: User, agentId: number) => Promise<any>) {
    this.cqListeners.push(async (q) => {
      console.log(q.data, !specialIds.includes(+q.data!.substring(6)));
      if (
        q.data?.startsWith("agent-") &&
        !specialIds.includes(+q.data.substring(6))
      ) {
        const user = await this.getUser(q);
        if (!user) return;
        const agentId = +q.data.substring(6);
        await f(user, agentId);
      }
    });
  }

  public onGroups(f: (user: User) => Promise<any>) {
    this.bot.onText(/\/neuro/, async (msg) => {
      const user = await this.getUser(msg);
      await f(user);
    });
    this.cqListeners.push(async (q, user) => {
      if (q.data === "groups-1") {
        await f(user);
      }
    });
  }

  public onGroups2(f: (user: User) => Promise<any>) {
    this.cqListeners.push(async (q, user) => {
      if (q.data === "groups-2") {
        await f(user);
      }
    });
  }

  public onAgents(f: (user: User, group: string) => Promise<any>) {
    this.cqListeners.push(async (q, user) => {
      if (q.data?.startsWith("group-")) {
        await f(user, q.data.substring(6));
      }
    });
  }

  public onDialog(f: (user: User, dialogId: number) => Promise<any>) {
    this.cqListeners.push(async (q, user) => {
      if (q.data?.startsWith("dialog-")) {
        await f(user, +q.data.substring(7));
      }
    });
  }

  public onContinueDialog(f: (user: User, dialogId: number) => Promise<any>) {
    this.cqListeners.push(async (q, user) => {
      if (q.data?.startsWith("continue-dialog-")) {
        await f(user, +q.data.substring(16));
      }
    });
  }

  public onDeleteDialog(f: (user: User, dialogId: number) => Promise<any>) {
    this.cqListeners.push(async (q) => {
      if (q.data?.startsWith("delete-dialog-")) {
        const user = await this.getUser(q, {
          dialogs: true,
        });
        await f(user, +q.data.substring(14));
      }
    });
  }

  public onFeaturedDialogs(f: (user: User) => Promise<any>) {
    this.cqListeners.push(async (q, user) => {
      if (q.data === "featured-dialogs") {
        await f(user);
      }
    });
  }

  public onAllDialogs(f: (user: User) => Promise<any>) {
    this.cqListeners.push(async (q, user) => {
      if (q.data === "all-dialogs") {
        await f(user);
      }
    });
  }

  public onRemoveFeaturedDialog(
    f: (user: User, dialogId: number) => Promise<any>,
  ) {
    this.cqListeners.push(async (q, user) => {
      if (q.data?.startsWith("remove-featured-")) {
        await f(user, +q.data.substring(16));
      }
    });
  }
  public onMakeFeaturedDialog(
    f: (user: User, dialogId: number) => Promise<any>,
  ) {
    this.cqListeners.push(async (q, user) => {
      if (q.data?.startsWith("make-featured-")) {
        await f(user, +q.data.substring(14));
      }
    });
  }
  public onDeleteAllDialogs(f: (user: User) => Promise<any>) {
    this.cqListeners.push(async (q, user) => {
      if (q.data === "delete-all-dialogs") {
        await f(user);
      }
    });
  }
  public onDeleteFeaturedDialogs(f: (user: User) => Promise<any>) {
    this.cqListeners.push(async (q, user) => {
      if (q.data === "delete-featured-dialogs") {
        await f(user);
      }
    });
  }
  public onExportFeaturedDialogs(f: (user: User) => Promise<any>) {
    this.cqListeners.push(async (q, user) => {
      if (q.data === "export-featured-dialogs") {
        await f(user);
      }
    });
  }

  public onTextInput(f: (user: User, text: string) => Promise<any>) {
    this.freeTextListeners.push(async (msg, user) => {
      await f(user, msg.text!);
    });
  }

  public onDataInput(f: (user: User, type: string) => Promise<any>) {
    this.cqListeners.push(async (q, user) => {
      if (q.data?.startsWith("take-")) {
        await f(user, q.data.substring(5));
      }
    });
  }

  public onTakeFromData(f: (user: User) => Promise<any>) {
    this.cqListeners.push(async (q, user) => {
      if (q.data === "from-data") {
        await f(user);
      }
    });
  }

  public onChangeData(f: (user: User, category: string) => Promise<any>) {
    this.cqListeners.push(async (q, user) => {
      if (q.data?.startsWith("change-")) {
        await f(user, q.data.substring(7));
      }
    });
  }
  public onLeaveData(f: (user: User) => Promise<any>) {
    this.cqListeners.push(async (q, user) => {
      if (q.data === "leave") {
        await f(user);
      }
    });
  }

  public onBuySubscription(f: (user: User) => Promise<any>) {
    this.cqListeners.push(async (q, user) => {
      if (q.data === "b-sub") {
        await f(user);
      }
    });
  }

  public onBuyTokens(f: (user: User) => Promise<any>) {
    this.cqListeners.push(async (q, user) => {
      if (q.data === "b-tokens") {
        await f(user);
      }
    });
  }

  public onSubType(f: (user: User, type: string) => Promise<any>) {
    this.cqListeners.push(async (q, user) => {
      if (q.data?.startsWith("sub-")) {
        await f(user, q.data.substring(4));
      }
    });
  }

  public onTokensType(f: (user: User, amount: number) => Promise<any>) {
    this.cqListeners.push(async (q, user) => {
      if (q.data?.startsWith("tokens-")) {
        await f(user, +q.data.substring(7));
      }
    });
  }

  public onIHavePaid(
    f: (user: User, data: string, msgId: number) => Promise<any>,
  ) {
    this.cqListeners.push(async (q, user) => {
      if (q.data?.startsWith("ihavepaid-")) {
        await f(user, q.data.substring(10), q.message!.message_id);
      }
    });
  }

  public onUpdateTokens(f: (user: User) => Promise<any>) {
    cron.schedule("0 0 * * *", async () => {
      const users = await manager.find(User);

      for (const user of users) {
        await f(user);
      }
    });
  }

  public onCancelSub(f: (user: User) => Promise<any>) {
    this.cqListeners.push(async (q, user) => {
      if (q.data === "cancel-sub") {
        await f(user);
      }
    });
  }

  public onRef(f: (user: User) => Promise<any>) {
    this.bot.onText(/\/ref/, async (msg) => {
      const user = await this.getUser(msg);
      await f(user);
    });
  }

  public onSettings(f: (user: User) => Promise<any>) {
    this.bot.onText(/\/settings/, async (msg) => {
      const user = await this.getUser(msg);
      await f(user);
    });
  }

  public onSetting(f: (user: User, setting: string) => Promise<any>) {
    this.cqListeners.push(async (q, user) => {
      if (q.data?.startsWith("settings-")) {
        await f(user, q.data.substring(9));
      }
    });
  }

  public onGenerateImage(f: (user: User, text: string) => Promise<any>) {
    this.freeTextListeners.push(async (msg, user) => {
      if (user.usingImageGeneration) {
        await f(user, msg.text!);
        return true;
      }
    });
  }

  public onEnterImage(f: (user: User) => Promise<any>) {
    this.cqListeners.push(async (q, user) => {
      if (q.data === "images") {
        await f(user);
      }
    });
  }

  public onSetResolution(f: (user: User, res: string) => Promise<any>) {
    this.cqListeners.push(async (q, user) => {
      if (q.data?.startsWith("res-")) {
        await f(user, q.data.substring(4));
      }
    });
  }

  public onCalculateCosts(f: (user: User, url: string) => Promise<any>) {
    this.bot.on("audio", async (msg) => {
      if (!msg.audio) return;
      const user = await this.getUser(msg);
      const url = await this.bot.getFileLink(msg.audio.file_id);
      await f(user, url);
    });
  }

  public onTranscribeSaved(f: (user: User, id: string) => Promise<any>) {
    this.cqListeners.push(async (q, user) => {
      if (
        q.data?.startsWith("transcription-") &&
        user.currentAudioAgent === "transcriber"
      ) {
        await f(user, q.data.substring(14));
      }
    });
  }

  public onSummarize(f: (user: User, id: string) => Promise<any>) {
    this.cqListeners.push(async (q, user) => {
      if (
        q.data?.startsWith("transcription-") &&
        user.currentAudioAgent === "summarizer"
      ) {
        await f(user, q.data.substring(14));
      }
    });
  }

  public onSummarizer(f: (user: User) => Promise<any>) {
    this.cqListeners.push(async (q, user) => {
      if (q.data === "audiosum") {
        await f(user);
      }
    });
  }

  public onTranscriber(f: (user: User) => Promise<any>) {
    this.cqListeners.push(async (q, user) => {
      if (q.data === "audio") {
        await f(user);
      }
    });
  }

  public onTranscribeNonSaved(f: (user: User, url: string) => Promise<any>) {
    this.voiceListeners.push(async (msg, user) => {
      if (user.currentAudioAgent === "transcriber") {
        const url = await this.bot.getFileLink(msg.voice!.file_id);
        await f(user, url);
      }
    });
  }

  public onVoiceInput(f: (user: User, url: string) => Promise<any>) {
    this.voiceListeners.push(async (msg, user) => {
      if (user.agentId !== 0) {
        const url = await this.bot.getFileLink(msg.voice!.file_id);
        await f(user, url);
      }
    });
  }

  public onDocInput(
    f: (user: User, url: string, caption?: string) => Promise<any>,
  ) {
    this.bot.on("document", async (msg) => {
      if (!msg.document) return;
      const user = await this.getUser(msg);
      const url = await this.bot.getFileLink(msg.document.file_id);
      await f(user, url, msg.caption);
    });
  }

  public onImageInput(
    f: (user: User, url: string, caption?: string) => Promise<any>,
  ) {
    this.bot.on("photo", async (msg) => {
      if (!msg.photo) return;
      const user = await this.getUser(msg);
      const url = await this.bot.getFileLink(
        msg.photo.sort((a, b) => b.height * b.width - a.height * a.width)[0]!
          .file_id,
      );
      await f(user, url, msg.caption);
    });
  }

  public onMyData(f: (user: User) => Promise<any>) {
    this.bot.onText(/\/data/, async (msg) => {
      const user = await this.getUser(msg);
      await f(user);
    });
  }

  public onDataCategory(f: (user: User, category: string) => Promise<any>) {
    this.cqListeners.push(async (q, user) => {
      if (q.data?.startsWith("data-")) {
        await f(user, q.data.substring(5));
      }
    });
  }

  public onData(f: (user: User, data: string) => Promise<any>) {
    this.freeTextListeners.push(async (msg, user) => {
      if (user.waitingForData !== "") {
        await f(user, msg.text!);
        return true;
      }
    });
  }

  public onAbout(f: (id: number) => Promise<any>) {
    this.bot.onText(/\/about/, async (msg) => {
      await f(msg.from!.id);
    });
  }

  public onHelp(f: (id: number) => Promise<any>) {
    this.bot.onText(/\/help/, async (msg) => {
      await f(msg.from!.id);
    });
  }

  public onTerms(f: (id: number) => Promise<any>) {
    this.bot.onText(/\/terms/, async (msg) => {
      await f(msg.from!.id);
    });
  }

  public onFreeTokens(f: (user: User) => Promise<any>) {
    this.bot.onText(/\/free/, async (msg) => {
      const user = await this.getUser(msg);
      await f(user);
    });
  }

  public onPromoCode(f: (user: User, promo: string) => Promise<any>) {
    this.freeTextListeners.push(async (msg, user) => {
      if (user.waitingForPromo) {
        await f(user, msg.text!);
        return true;
      }
    });
  }

  public onBalance(f: (user: User) => Promise<any>) {
    this.bot.onText(/\/balance/, async (msg) => {
      const user = await this.getUser(msg);
      await f(user);
    });
    this.cqListeners.push(async (q, user) => {
      if (q.data === "balance") {
        await f(user);
      }
    });
  }

  public onCopyWriterStyles(f: (user: User) => Promise<any>) {
    this.cqListeners.push(async (q, user) => {
      if (q.data === "agent-1") {
        await f(user);
      }
    });
  }

  public onCopyWriterStyle(f: (user: User, style: string) => Promise<any>) {
    this.cqListeners.push(async (q, user) => {
      if (q.data?.startsWith("textstyle-")) {
        await f(user, q.data.substring(10));
      }
    });
  }

  public onCopyWriterTone(f: (user: User, tone: string) => Promise<any>) {
    this.cqListeners.push(async (q, user) => {
      if (q.data?.startsWith("texttone-")) {
        await f(user, q.data.substring(9));
      }
    });
  }

  public onOfferSizes(f: (user: User) => Promise<any>) {
    this.cqListeners.push(async (q, user) => {
      if (q.data === "agent-2") {
        await f(user);
      }
    });
  }

  public onOfferSize(f: (user: User, size: string) => Promise<any>) {
    this.cqListeners.push(async (q, user) => {
      if (q.data?.startsWith("offersize-")) {
        await f(user, q.data.substring(10));
      }
    });
  }

  public onOfferModel(f: (user: User, model: string) => Promise<any>) {
    this.cqListeners.push(async (q, user) => {
      if (q.data?.startsWith("offermodel-")) {
        await f(user, q.data.substring(11));
      }
    });
  }

  public onPostTypes(f: (user: User) => Promise<any>) {
    this.cqListeners.push(async (q, user) => {
      if (q.data === "agent-2") {
        await f(user);
      }
    });
  }

  public onPostType(f: (user: User, type: string) => Promise<any>) {
    this.cqListeners.push(async (q, user) => {
      if (q.data?.startsWith("posttype-")) {
        await f(user, q.data.substring(9));
      }
    });
  }

  public onPostStyle(
    f: (user: User, style: string, msgId: number) => Promise<any>,
  ) {
    this.cqListeners.push(async (q, user) => {
      if (q.data?.startsWith("poststyle-")) {
        await f(user, q.data.substring(10), q.message!.message_id);
      }
    });
  }

  public onPostStylesConfirm(f: (user: User) => Promise<any>) {
    this.cqListeners.push(async (q, user) => {
      if (q.data === "poststyles-confirm") {
        await f(user);
      }
    });
  }

  public onPostStylesReject(f: (user: User) => Promise<any>) {
    this.cqListeners.push(async (q, user) => {
      if (q.data === "poststyles-reject") {
        await f(user);
      }
    });
  }

  public onModel(f: (user: User, model: string) => Promise<any>) {
    this.cqListeners.push(async (q, user) => {
      if (q.data?.startsWith("model-")) {
        await f(user, q.data.substring(6));
      }
    });
  }

  public onCount(f: (user: User) => Promise<any>) {
    this.cqListeners.push(async (q, user) => {
      if (q.data === "toggle-count") {
        await f(user);
      }
    });
  }

  public onFormat(f: (user: User, format: string) => Promise<any>) {
    this.cqListeners.push(async (q, user) => {
      if (q.data?.startsWith("format-")) {
        await f(user, q.data.substring(7));
      }
    });
  }

  public setListeners() {
    this.bot.on("callback_query", async (q) => {
      try {
        if (
          !q.data?.startsWith("ihavepaid-") &&
          !q.data?.startsWith("model-") &&
          q.message
        ) {
          await this.bot.deleteMessage(q.from.id, q.message?.message_id);
        }
        await wait(0.5);
        const user = await this.getUser(q);
        for (const f of this.cqListeners) {
          const result = await f(q, user);
          if (result === true) break;
        }
      } catch (e) {
        console.error(e);
      }
    });
    this.bot.onText(/./, async (msg) => {
      try {
        if (msg.text && !msg.text.startsWith("/")) {
          const user = await this.getUser(msg);
          for (const f of this.freeTextListeners) {
            const result = await f(msg, user);
            if (result === true) break;
          }
        }
      } catch (e) {
        console.error(e);
      }
    });
    this.bot.on("voice", async (msg) => {
      if (!msg.voice) return;
      const user = await this.getUser(msg);
      for (const f of this.voiceListeners) {
        const result = await f(msg, user);
        if (result === true) break;
      }
    });
  }
}
