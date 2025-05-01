import { User } from "../../../../../entity/User";
import { api } from "../../../../apis/API";
import { Bot } from "../../../../Bot";
import { IController } from "../../../Controller";
import { BalanceController } from "../../balance/BalanceController";
import { Converter } from "../../balance/Converter";
import { OutputController } from "../output/OutputController";


export class ImageInputController implements IController {
    public bind() {}
    
      constructor(
        private bot: Bot,
        private balanceController: BalanceController,
        private outputController: OutputController
      ) {}
    
      private async onDocument(user: User, url: string, caption?: string) {
        const limit = await this.balanceController.getLimit(user);
        if (!limit) return;
    
        const conv = user.conversations.find((el) => el.active);
        if (!conv) return;
    
        const result = await api.run({
          api: user.model.api,
          input: url,
          model: user.model.id,
          type: "image",
          conversation: conv,
          user,
          store: true,
          instructions: user.agent!.prompt,
          maxTokens: limit,
          caption,
        });
    
        await this.balanceController.subtractCost(
          Converter.TKRUB(result.tokens, user.model),
          user
        );
    
        await this.outputController.sendOutput(result.content, user, conv);
      }
}