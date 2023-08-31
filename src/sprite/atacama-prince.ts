import { Scene, Sprite } from "../phaser";
import {
  createSpriteAnimations,
  getSpriteSheet,
  playSpriteAnimation,
} from "../helpers";

import { Person } from "./person";
import { Vector } from "../phaser";
import { colors } from "../config";

export class AtacamaPrince extends Person<Sprite> {
  private _hasCamera = false;

  constructor(scene: Scene, x: number, y: number) {
    const { key, info } = getSpriteSheet(scene.registry, "atacama", "prince");
    super(scene.add.sprite(x, y, key).setOrigin(0).setSize(18, 27));
    createSpriteAnimations(this.object, key, info);
    this.setBalloonColors({
      fill: colors.emerald,
      text: colors.white,
    })
      .setBalloonOffset(new Vector(0, -7))
      .setMaxCharsPerLine(24);
    this.idle();
  }

  public get hasCamera() {
    return this._hasCamera;
  }

  public idle() {
    this.object.anims.play("idle");
  }

  public async putCameraAway() {
    this._hasCamera = false;
    await playSpriteAnimation(this.object, "camera", false, true);
    this.idle();
  }

  public async shoot() {
    await playSpriteAnimation(this.object, "shoot", true);
    this.object.anims.playReverse("camera");
    this.object.anims.pause();
  }

  public async takeCamera() {
    this._hasCamera = true;
    await playSpriteAnimation(this.object, "camera");
  }
}
