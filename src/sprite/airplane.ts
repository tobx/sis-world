import {
  createSpriteAnimations,
  getSpriteSheet,
  playSpriteAnimation,
} from "../helpers";

import { Scene } from "../phaser";

export class Airplane {
  public object;

  constructor(scene: Scene, x: number, y: number) {
    const { key, info } = getSpriteSheet(scene.registry, "global", "airplane");
    this.object = scene.physics.add
      .sprite(x, y, key)
      .setOrigin(0)
      .setPushable(false);
    this.object.setSize(126, 25).setOffset(21, 28);
    createSpriteAnimations(this.object, key, info);
    this.idle();
  }

  public idle() {
    this.object.anims.play("idle");
  }

  public async retractLandingGear(animate = true) {
    if (animate) {
      await playSpriteAnimation(this.object, "retract", true);
    } else {
      this.object.anims.playReverse("retract");
      this.object.anims.pause();
    }
  }
}
