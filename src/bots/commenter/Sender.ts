import { TelegramClient } from "telegram";
import { Channel } from "../../entity/Channel";
import { Job, Queue, Worker } from "bullmq";

interface ISendComment {
  channel: Channel;
  comment: string;
  botId: string;
  postId: number;
}

export class Sender {
  private queue: Queue<ISendComment> = new Queue("com-out", {
    connection: {
      host: "redis",
    },
  });
  private worker: Worker<ISendComment>;

  constructor(private clients: Map<string, TelegramClient>) {
    this.onSend = this.onSend.bind(this);
    this.worker = new Worker("com-out", this.onSend, {
      connection: {
        host: "redis",
      },
      concurrency: 1,
    });
  }

  private async onSend(job: Job<ISendComment>) {
    const client = this.clients.get(job.data.botId);
    try {
      await client!.sendMessage(job.data.channel.id, {
        message: job.data.comment,
        commentTo: job.data.postId,
      });
    } catch (err) {
      // TODO: handle error
      console.log(err);
    }
  }

  public async add(data: ISendComment) {
    await this.queue.add("comment", data);
  }
}
