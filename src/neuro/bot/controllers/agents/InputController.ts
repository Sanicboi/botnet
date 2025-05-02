import { Bot } from "../../../Bot";
import { IController } from "../../Controller";
import { BalanceController } from "../balance/BalanceController";
import { DocumentInputController } from "./input/DocumentInputController";
import { ImageInputController } from "./input/ImageInputController";
import { TextInputController } from "./input/TextInputController";
import { OutputController } from "./output/OutputController";

/**
 * This controller combines all the controllers in the "input" folder
 */
export class InputController implements IController {
  private text: TextInputController;
  private image: ImageInputController;
  private document: DocumentInputController;
  constructor(
    private bot: Bot,
    private balanceController: BalanceController,
    private outputController: OutputController,
  ) {
    this.text = new TextInputController(
      bot,
      balanceController,
      outputController,
    );
    this.image = new ImageInputController(
      bot,
      balanceController,
      outputController,
    );
    this.document = new DocumentInputController(
      bot,
      balanceController,
      outputController,
    );
  }

  public bind() {
    this.image.bind();
    this.document.bind();
    this.text.bind();
  }
}
