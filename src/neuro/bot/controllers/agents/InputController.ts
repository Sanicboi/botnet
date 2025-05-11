import { Bot } from "../../../Bot";
import { IController } from "../../Controller";
import { BalanceController } from "../balance/BalanceController";
import { DocumentInputController } from "./input/DocumentInputController";
import { ImageInputController } from "./input/ImageInputController";
import { TextInputController } from "./input/TextInputController";
import { VoiceInputController } from "./input/VoiceInputController";
import { OutputController } from "./output/OutputController";
import { TranscriptionController } from "./TranscriptionController";

/**
 * This controller combines all the controllers in the "input" folder
 */
export class InputController implements IController {
  private text: TextInputController;
  private image: ImageInputController;
  private document: DocumentInputController;
  private voice: VoiceInputController;
  constructor(
    private bot: Bot,
    private balanceController: BalanceController,
    private outputController: OutputController,
    private transcriptionController: TranscriptionController,
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
    this.voice = new VoiceInputController(
      this.bot,
      this.balanceController,
      this.outputController,
      this.transcriptionController,
    );
  }

  public bind() {
    this.image.bind();
    this.document.bind();
    this.voice.bind();
    this.text.bind();
  }
}
