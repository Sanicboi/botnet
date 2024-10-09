import OpenAI from "openai";
import { User } from "./entity/User";
import { Bot } from "./entity/Bot";

export interface IData {
  userPhone: string;
  dateTime: string;
  segment: string;
  comment: string;
  dialog: string;
}

type Callback = (
  msg: string,
  user: User,
  bot: Bot,
  data: IData
) => Promise<void>;

export class Assistant {
  constructor(private openai: OpenAI) {
  }

  public async answerMessage(
    msg: string,
    user: User,
    bot: Bot,
    onRequresAction: Callback
  ): Promise<string[]> {
    let result: string[] = [];
    await this.openai.beta.threads.messages.create(user.cascade.threadId, {
      role: "user",
      content: msg,
    });

    const run = this.openai.beta.threads.runs.stream(user.cascade.threadId, {
      assistant_id:
        // bot.gender === "male"
        //   ? "asst_8RgJFwUqF11WAfl4uMcOlufE"
        //   : "asst_LNGeR2YXA5i8i4HluS549xg5",
        'asst_vK4VgYVrZdCWp0GW52RG7uTN'
    });
    const msgsBefore = await run.finalMessages();
    result.push(
      ...msgsBefore.map((el) => {
        if (el.content[0].type == "text") {
          return el.content[0].text.value;
        } else {
          return "";
        }
      })
    );
    const finalRun = await run.finalRun();

    if (
      finalRun.status === "requires_action" &&
      finalRun.required_action?.type === "submit_tool_outputs" &&
      finalRun.required_action
    ) {
      const data: IData = JSON.parse(
        finalRun.required_action.submit_tool_outputs.tool_calls[0].function
          .arguments
      );
      await onRequresAction(msg, user, bot, data);
      await this.openai.beta.threads.runs
        .submitToolOutputsStream(user.cascade.threadId, finalRun.id, {
          tool_outputs: [
            {
              output: "Встреча записана.",
              tool_call_id:
                finalRun.required_action.submit_tool_outputs.tool_calls[0].id,
            },
          ],
        })
        // @ts-ignore
        .on("messageDone", (el) => result.push(el.content[0].text.value))
        .finalMessages();
    }
    return result;
  };

  public async commentPost(text: string): Promise<string[]> {
    const thread = await this.openai.beta.threads.create({
      messages: [
        {
          role: 'user',
          content: text
        }
      ]
    });

    const msgs = await this.openai.beta.threads.runs.stream(thread.id, {
      assistant_id: 'asst_vK4VgYVrZdCWp0GW52RG7uTN'
    }).finalMessages();

    await this.openai.beta.threads.del(thread.id);

    return msgs.map(el => {
      if (el.content[0].type === 'text') return el.content[0].text.value;
      return '';
    })
  }
}
