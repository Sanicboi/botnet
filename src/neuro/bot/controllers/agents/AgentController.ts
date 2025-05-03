import { User } from "../../../../entity/User";
import { Bot } from "../../../Bot";
import { IController } from "../../Controller";

/**
 * Объединяет вообще все, связанное с агентами
 * Привязывает все в этой папке
 * Делегирует задачи другим контроллерам
 */
export class AgentController implements IController {
  constructor(private bot: Bot) {}

  public bind() {}

  private async startConversation(user: User, agentId: string) {}
}
