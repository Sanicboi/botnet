import { IJob, openai, queues } from ".";
import { AppDataSource } from "../data-source";
import { Dialog } from "../entity/bots/Dialog";

export class MailerHandler {
  public static async handle(j: IJob) {
    if (j.type === "mailer") {
      if (j.task === "create") {
        console.log("create thread");
        const d = new Dialog();
        d.threadId = (await openai.beta.threads.create()).id;
        d.botId = j.botId;
        d.leadId = j.toId;
        await AppDataSource.manager.save(d);

        // TODO: randomize the message && change the way they are stored

        await openai.beta.threads.messages.create(d.threadId, {
          content: "Начни диалог.",
          role: "user",
        });
        const response = await openai.beta.threads.runs
          .stream(d.threadId, {
            assistant_id: "asst_YXPLxGoGi3m15k3XbAfL5nGg",
          })
          .finalMessages();

        const msg = response[0].content[0];
        if (msg.type !== "text") return;
        await queues.mailer.add("j", {
          botId: j.botId,
          message: msg.text.value.replaceAll(/【.*?†.*】/g, ""),
          sendToId: j.toId,
        });
      } else if (j.task === "reply") {
        const d = await AppDataSource.manager.findOneBy(Dialog, {
          botId: j.botId,
          leadId: j.toId,
        });
        if (!d) return;
        await openai.beta.threads.messages.create(d.threadId, {
          content: j.msg,
          role: "user",
        });
        const msgs = await openai.beta.threads.runs
          .stream(d!.threadId, {
            assistant_id: "asst_YXPLxGoGi3m15k3XbAfL5nGg",
          })
          .finalMessages();

        if (msgs[0].content[0].type != "text") return;

        await queues.mailer.add("j", {
          botId: j.botId,
          message: msgs[0].content[0].text.value.replaceAll(
            /【.*?†source】/g,
            "",
          ),
          sendToId: j.toId,
        });
      }
    }
  }
}
