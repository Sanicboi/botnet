import { IJob, openai, queues } from ".";
import { FileHandler } from "./FileHandler";

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
      } else if (j.task === "run") {
        const docs = await FileHandler.uploadDocuments(j);
        const images = await FileHandler.uploadImages(j);

        const attachments: {
          file_id: string;
        }[] = [];

        docs.forEach((el) =>
          attachments.push({
            file_id: el,
          }),
        );
        images.forEach((el) =>
          attachments.push({
            file_id: el,
          }),
        );

        await openai.beta.threads.messages.create(j.threadId, {
          content: j.message.content,
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
      }
    }
  }
}
