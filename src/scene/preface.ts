import { MultilineText, defaultTextDuration, getLines } from "../text";

import { Scene } from "./scene";
import { Vector } from "../phaser";
import { fonts } from "../config";
import { getfontData } from "../helpers";

const TYPE_DURATION = 1000 / 20;

export class PrefaceScene extends Scene<void, void> {
  private center?: Vector;

  private typeSoundConfig = { volume: 1 / 64 };

  constructor() {
    super("preface");
  }

  public async create() {
    // required to pause the game
    this.addControls();

    this.center = this.screenCenter;
    const texts = this.getText();
    await this.delay(1000);
    for (const text of texts) {
      const [textObjects] = await Promise.all([
        this.displayText(text),
        this.delay(defaultTextDuration(text)),
      ]);
      for (const textObject of textObjects) {
        textObject.destroy();
      }
      await this.delay(2000);
    }
    this.complete(true);
  }

  private async displayText(text: MultilineText) {
    const lineHeight = getfontData(this, fonts.normal)!.lineHeight + 2;
    const lines = getLines(text);
    const textObjects = [];
    for (const [index, line] of lines.entries()) {
      const textObject = this.make
        .bitmapText({ font: fonts.normal, text: line }, false)
        .setOrigin(0);
      textObject
        .setPosition(
          this.center!.x - textObject.width / 2,
          this.center!.y + lineHeight * (index - lines.length / 2)
        )
        .setText("");
      this.add.existing(textObject);
      for (const char of line) {
        await this.delay(TYPE_DURATION);
        textObject.setText(textObject.text + char);
        if (/\S/.test(char)) {
          this.sound.play("typing", this.typeSoundConfig);
        }
      }
      textObjects.push(textObject);
    }
    return textObjects;
  }
}
