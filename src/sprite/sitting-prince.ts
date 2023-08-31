import {
  createSpriteAnimations,
  getSpriteSheet,
  playSpriteAnimation,
} from "../helpers";

import { Scene } from "../phaser";

export class SittingPrince {
  public object;

  constructor(scene: Scene, x: number, y: number) {
    const { key, info } = getSpriteSheet(
      scene.registry,
      "fifth-floor",
      "sitting-prince"
    );
    this.object = scene.add.sprite(x, y, key).setOrigin(0).setSize(10, 22);
    createSpriteAnimations(this.object, key, info);
    this.work();
  }

  public async moveEyes() {
    await playSpriteAnimation(this.object, "move-eyes", true);
    this.object.anims.play("work");
  }

  public work() {
    this.object.anims.play("work");
  }
}
