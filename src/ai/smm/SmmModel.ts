import OpenAI from "openai";

export class SmmModel {
  constructor(private openai: OpenAI) {}

  public async run(thread: string, msg: string): Promise<string[]> {
    let result: string[] = [];

    try {
      await this.openai.beta.threads.messages.create(thread, {
        content: msg,
        role: "user",
      });
      const msgs = await this.openai.beta.threads.runs
        .stream(thread, {
          assistant_id: "asst_dVqAwnpHg1XLbpFwLtJbBPF6",
        })
        .finalMessages();

      for (const msg of msgs) {
        if (msg.content[0].type === "text") {
          result.push(msg.content[0].text.value);
        }
      }
    } catch (err) {
      console.error(err);
    }

    return result;
  }

  public async createThread(): Promise<string> {
    const r = await this.openai.beta.threads.create();
    return r.id;
  }

  public async deleteThread(thread: string) {
    await this.openai.beta.threads.del(thread);
  }
}
