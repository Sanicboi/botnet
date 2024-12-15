import { MessageContentPartParam } from "openai/resources/beta/threads/messages";
import { IJob, openai, queues } from ".";
import { FileHandler } from "./FileHandler";
import axios from "axios";
import path from "path";
import { v4 } from "uuid";
import fs from 'fs';

export class NeuroHandler {
  public static async handle(j: IJob) {
    if (j.type === "neuro") {
      if (j.task === "create") {
        const t = await openai.beta.threads.create();
        await queues.neuro.add("j", {
          ...j,
          threadId: t.id,
        });
      } else if (j.task === "delete") {
        await openai.beta.threads.del(j.id);
        await FileHandler.deleteFiles(j.userId);
        await queues.neuro.add("j", {
          ...j,
        });
      } else if (j.task === "run") {
        const docs = await FileHandler.uploadDocuments(j);

        const attachments: {
          file_id: string;
        }[] = [];

        docs.forEach((el) =>
          attachments.push({
            file_id: el,
          }),
        );
        let content: MessageContentPartParam[] = [];
        content.push({
          text: j.message.content,
          type: "text",
        });
        if (j.message.images) {
          for (const i of j.message.images) {
            content.push({
              image_url: {
                url: i,
                detail: "high",
              },
              type: "image_url",
            });
          }
        }
        await openai.beta.threads.messages.create(j.threadId, {
          content,
          role: j.message.role,
          attachments: attachments,
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
      } else if (j.task === "voice") {
        const res = await axios.get(j.voiceUrl, {
          responseType: 'arraybuffer',
        });
        const name = v4() + path.extname(j.voiceUrl);
        fs.writeFileSync(path.join(process.cwd(), 'voice', name), res.data);

        const transcription = await openai.audio.transcriptions.create({
          file: fs.createReadStream(path.join(process.cwd(), 'voice', name)),
          model: "whisper-1",
        });
        
        fs.rmSync(path.join(process.cwd(), 'voice', name));
        await this.handle({
          task: "run",
          type: "neuro",
          actionId: j.actionId,
          message: {
            content: transcription.text,
            role: "user",
          },
          model: j.model,
          msgId: j.msgId,
          threadId: j.threadId,
          userId: j.userId,
        });
      }
    }
  }
}
