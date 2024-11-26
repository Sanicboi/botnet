import { Job, Queue, Worker } from "bullmq";
import OpenAI from "openai";
import pino from "pino";

const logger = pino();

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY ?? "",
});

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
}

interface INeuroImageJob extends INeuroJob {
  task: "image";
  prompt: string;
  resolution: "1024x1024" | "1024x1792" | "1792x1024";
}

interface INeuroOutJob extends INeuroJob {
  threadId?: string;
  messages?: string[];
  imageUrl?: string;
  tokenCount?: number;
}

interface INeuroFileJob extends INeuroJob {
  task: "run-file";
  fileId: string;
  threadId: string;
  model: OpenAI.ChatModel;
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
  ;

const queues = {
  neuro: new Queue<INeuroOutJob>("neuro", {
    connection: {
      host: "redis",
    },
  }),
};

const worker = new Worker(
  "openai",
  async (job: Job<IJob>) => {
    try {
      const j = job.data;
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
        } else if (j.task === 'run-file') {
          await openai.beta.threads.messages.create(j.threadId, {
            attachments: [
              {
                file_id: j.fileId,
              }
            ],
            content: 'Вот входные данные',
            role: 'user'
          });
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
