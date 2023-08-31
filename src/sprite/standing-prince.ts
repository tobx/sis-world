import { Scene, Sprite } from "../phaser";
import { createSpriteAnimations, getSpriteSheet } from "../helpers";

import { Person } from "./person";
import { Vector } from "../phaser";
import { colors } from "../config";

export class StandingPrince extends Person<Sprite> {
  constructor(scene: Scene, x: number, y: number) {
    const { key, info } = getSpriteSheet(
      scene.registry,
      "fifth-floor",
      "standing-prince"
    );
    super(scene.add.sprite(x, y, key).setOrigin(0).setSize(9, 27));
    createSpriteAnimations(this.object, key, info);
    this.setBalloonColors({
      fill: colors.emerald,
      text: colors.white,
    })
      .setBalloonOffset(new Vector(0, -7))
      .setMaxCharsPerLine(20);
    this.letLoose();
  }

  public drawInTummy() {
    this.object.anims.play("normal");
  }

  public turnLeft() {
    this.object.setFlipX(true);
  }

  public letLoose() {
    this.object.anims.play("tummy");
  }
}
