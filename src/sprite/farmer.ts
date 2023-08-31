import { Scene, Sprite } from "../phaser";
import { createSpriteAnimations, getSpriteSheet } from "../helpers";

import { Person } from "./person";
import { Vector } from "../phaser";
import { colors } from "../config";

export class Farmer extends Person<Sprite> {
  constructor(scene: Scene, x: number, y: number) {
    const { key, info } = getSpriteSheet(scene.registry, "jurmo", "farmer");
    super(scene.add.sprite(x, y, key).setOrigin(0).setSize(15, 23));
    createSpriteAnimations(this.object, key, info);
    this.setBalloonColors({
      text: colors.brown,
    })
      .setBalloonOffset(new Vector(0, -7))
      .setMaxCharsPerLine(24);
    this.watch();
  }

  public idle() {
    this.object.anims.play("idle");
  }

  public watch() {
    this.object.anims.play("watch");
  }
}
