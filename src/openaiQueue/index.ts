import { Job, Queue, Worker } from "bullmq";
import OpenAI from "openai";
import pino from "pino";
import { AppDataSource } from "../data-source";
import { Dialog } from "../entity/bots/Dialog";

const logger = pino();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY ?? "",
});

interface IMailerJob {
  type: "mailer";
  task: "create" | "reply";
  botId: string;
  toId: string;
  msg: string;
}

interface INeuroJob {
  type: "neuro";
  task: "delete" | "create" | "run" | "image" | "run-file";
  userId: string;
  actionId: string;
}

interface INeuroCreateThreadJob extends INeuroJob {
  task: "create";
}

interface INeuroDeleteThreadJob extends INeuroJob {
  task: "delete";
  id: string;
}

interface INeuroRunJob extends INeuroJob {
  task: "run";
  threadId: string;
  messages: Msg[];
  model: OpenAI.ChatModel;
  msgId: string;
}

interface INeuroImageJob extends INeuroJob {
  task: "image";
  prompt: string;
  resolution: "1024x1024" | "1024x1792" | "1792x1024";
  msgId: string;
}

interface INeuroOutJob extends INeuroJob {
  threadId?: string;
  messages?: string[];
  imageUrl?: string;
  tokenCount?: number;
  msgId?: string;
}

interface IMalerOutJob {
  botId: string;
  message: string;
  sendToId: string;
}

interface INeuroFileJob extends INeuroJob {
  task: "run-file";
  fileId: string;
  threadId: string;
  model: OpenAI.ChatModel;
  msgId: string;
}

interface Msg {
  role: "user" | "assistant";
  content: string;
}

type IJob =
  | INeuroCreateThreadJob
  | INeuroDeleteThreadJob
  | INeuroRunJob
  | INeuroImageJob
  | INeuroFileJob
  | IMailerJob;

const queues = {
  neuro: new Queue<INeuroOutJob>("neuro", {
    connection: {
      host: "redis",
    },
  }),
  mailer: new Queue<IMalerOutJob>("mailer-out", {
    connection: {
      host: "redis",
    },
  }),
};
AppDataSource.initialize();
const worker = new Worker(
  "openai",
  async (job: Job<IJob>) => {
    try {
      const j = job.data;
      console.log(j);
      if (j.type === "neuro") {
        if (j.task === "create") {
          const t = await openai.beta.threads.create();
          await queues.neuro.add("j", {
            ...j,
            threadId: t.id,
          });
        } else if (j.task === "delete") {
          await openai.beta.threads.del(j.id);
          await queues.neuro.add("j", j);
        } else if (j.task === "run") {
          for (const m of j.messages) {
            await openai.beta.threads.messages.create(j.threadId, m);
          }
          const str = openai.beta.threads.runs.stream(j.threadId, {
            assistant_id: j.actionId,
            model: j.model,
          });
          const msgs = await str.finalMessages();
          const run = await str.finalRun();
          const r = msgs.map((el) =>
            el.content[0].type === "text" ? el.content[0].text.value : "",
          );

          await queues.neuro.add("j", {
            ...j,
            messages: r,
            tokenCount: run.usage?.total_tokens,
          });
        } else if (j.task === "image") {
          const result = await openai.images.generate({
            prompt: j.prompt,
            model: "dall-e-3",
            n: 1,
            quality: "standard",
            response_format: "url",
            size: j.resolution,
          });
          await queues.neuro.add("j", {
            ...j,
            imageUrl: result.data[0].url,
          });
        } else if (j.task === "run-file") {
          await openai.beta.threads.messages.create(j.threadId, {
            attachments: [
              {
                file_id: j.fileId,
              },
            ],
            content: "Вот входные данные",
            role: "user",
          });
          const str = openai.beta.threads.runs.stream(j.threadId, {
            assistant_id: j.actionId,
            model: j.model,
          });
          const msgs = await str.finalMessages();
          const run = await str.finalRun();
          const r = msgs.map((el) =>
            el.content[0].type === "text" ? el.content[0].text.value.replaceAll(/【.*?†source】/, '') : "",
          );

          await queues.neuro.add("j", {
            ...j,
            messages: r,
            tokenCount: run.usage?.total_tokens,
          });
        }
      } else if (j.type === "mailer") {
        if (j.task === "create") {
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
          const response = await openai.beta.threads.runs.stream(d.threadId, {
            assistant_id: 'asst_YXPLxGoGi3m15k3XbAfL5nGg',
          }).finalMessages();

          const msg = response[0].content[0];
          if (msg.type !== 'text') return;
          await queues.mailer.add("j", {
            botId: j.botId,
            message: msg.text.value.replaceAll(/【.*?†source】/, ''),
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
            message: msgs[0].content[0].text.value.replaceAll(/【.*?†source】/, ''),
            sendToId: j.toId,
          });
        }
      }
    } catch (err) {
      logger.fatal(err);
    }
  },
  {
    connection: {
      host: "redis",
    },
  },
);
