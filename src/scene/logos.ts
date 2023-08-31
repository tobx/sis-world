import { ATLAS_KEY, fonts } from "../config";

import { Scene } from "./scene";
import { Vector } from "../phaser";

const GAP_DURATION = 1000;

const LOGO_DURATION = 4000;

const TEXT_DURATION = 2000;

const TYPE_DURATION = 1000 / 20;

export class LogosScene extends Scene<void, void> {
  private center?: Vector;

  constructor() {
    super("logos", false);
  }

  public async create() {
    super.create();
    this.addControls();
    this.center = this.screenCenter;
    this.controls!.start.on("down", () => this.complete());
    await this.displayMausAgLogo();
    await this.delay(GAP_DURATION);
    await this.displayText("in cooperation with");
    await this.delay(GAP_DURATION);
    await this.displayTsGamesLogo();
    await this.delay(GAP_DURATION);
    await this.displayText("presents");
    await this.delay(2 * GAP_DURATION);
    this.complete();
  }

  private async displayText(text: string) {
    const textObject = this.add.bitmapText(0, 0, fonts.normal, text);
    textObject.setPosition(
      this.center!.x - textObject.width / 2,
      this.center!.y - textObject.height / 2
    );
    textObject.setText("");
    const soundConfig = { volume: 1 / 64 };
    for (const char of text) {
      await this.delay(TYPE_DURATION);
      textObject.setText(textObject.text + char);
      if (/\S/.test(char)) {
        this.sound.play("typing", soundConfig);
      }
    }
    await this.delay(TEXT_DURATION);
    textObject.destroy();
  }

  private async displayMausAgLogo() {
    const mausAG = this.add.image(
      this.center!.x,
      this.center!.y,
      ATLAS_KEY,
      this.getImageKey("maus-ag")
    );
    this.getSound("maus-ag").setVolume(0.125).play();
    await this.delay(LOGO_DURATION);
    mausAG.destroy();
  }

  private async displayTsGamesLogo() {
    const tsGames = this.add.image(
      this.center!.x,
      this.center!.y,
      ATLAS_KEY,
      this.getImageKey("ts-games")
    );
    for (let i = 1, count = 4; i < count; i++) {
      tsGames.setScale(i / count);
      await this.delay(1000 / 15);
    }
    tsGames.setScale(1);
    this.getSound("ts-games").setVolume(0.125).play();
    await this.delay(LOGO_DURATION);
    tsGames.destroy();
  }
}
