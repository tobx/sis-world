import { createSpriteAnimations, getSpriteSheet } from "../helpers";

import { Scene } from "../phaser";

export class Cake {
  public object;

  constructor(scene: Scene, x: number, y: number) {
    const { key, info } = getSpriteSheet(scene.registry, "fifth-floor", "cake");
    this.object = scene.add.sprite(x, y, key).setOrigin(0).setSize(11, 9);
    createSpriteAnimations(this.object, key, info);
    this.normal();
  }

  public empty() {
    this.object.anims.play("empty");
  }

  public normal() {
    this.object.anims.play("normal");
  }
}
