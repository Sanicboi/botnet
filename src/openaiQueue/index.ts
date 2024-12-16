import { Job, Queue, Worker } from "bullmq";
import OpenAI from "openai";
import pino from "pino";
import { AppDataSource } from "../data-source";
import { NeuroHandler } from "./NeuroHandler";
import { MailerHandler } from "./MailerHandler";

const logger = pino();

export const openai = new OpenAI({
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
  task: "delete" | "create" | "run" | "image" | "voice";
  userId: string;
  actionId: string;
}

interface INeuroCreateThreadJob extends INeuroJob {
  task: "create";
}

interface INeuroDeleteThreadJob extends INeuroJob {
  task: "delete";
  id: string;
  sendResetMessage: boolean;
}

export interface INeuroRunJob extends INeuroJob {
  task: "run";
  threadId: string;
  message: Msg;
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
  result?: string;
  sendResetMessage?: boolean;
}

interface INeuroVoiceJob extends INeuroJob {
  task: "voice";
  generate: boolean;
  threadId: string;
  model: OpenAI.ChatModel;
  msgId: string;
  voiceUrl: string;
}

interface IMalerOutJob {
  botId: string;
  message: string;
  sendToId: string;
}

interface Msg {
  role: "user" | "assistant";
  content: string;
  images?: string[];
  files?: string[];
}

export type IJob =
  | INeuroCreateThreadJob
  | INeuroDeleteThreadJob
  | INeuroRunJob
  | INeuroImageJob
  | IMailerJob
  | INeuroVoiceJob;

export const queues = {
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

      await NeuroHandler.handle(j);
      await MailerHandler.handle(j);
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
