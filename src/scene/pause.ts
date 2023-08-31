import { colors, fonts } from "../config";

import { Scene } from "./scene";
import { SoundConfig } from "../phaser";

export class PauseScene extends Scene<void, void> {
  private soundConfig: SoundConfig = { volume: 0.25 };

  constructor() {
    super("pause", false);
  }

  public create() {
    this.sound.play("pause", this.soundConfig);
    this.addControls();
    this.controls!.start.on("down", () => {
      this.sound.play("resume", this.soundConfig);
      this.scene.stop();
    });
    const screenCenter = this.screenCenter;
    const titleObject = this.make.bitmapText(
      { font: fonts.heading1, text: this.getText("title") },
      false
    );
    titleObject
      .setPosition(
        screenCenter.x - titleObject.width / 2,
        screenCenter.y - titleObject.height / 2 - 6
      )
      .setTint(colors.white);
    const textObject = this.make.bitmapText(
      { font: fonts.normal, text: this.getText("text") },
      false
    );
    textObject
      .setPosition(
        screenCenter.x - textObject.width / 2,
        screenCenter.y - textObject.height / 2 + 8
      )
      .setTint(colors.white);
    const padding = 9;
    const width = Math.max(titleObject.width, textObject.width);
    const height = Math.max(titleObject.height, textObject.height);
    this.add
      .renderTexture(
        screenCenter.x,
        screenCenter.y,
        width + 2 * padding + 2,
        height + 2 * padding + 2
      )
      .fill(colors.white);
    this.add
      .renderTexture(
        screenCenter.x,
        screenCenter.y,
        width + 2 * padding,
        height + 2 * padding
      )
      .fill(colors.emerald);
    this.add.existing(titleObject);
    this.add.existing(textObject);
  }
}
