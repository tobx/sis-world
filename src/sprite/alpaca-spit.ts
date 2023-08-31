import {
  createSpriteAnimations,
  getSpriteSheet,
  playSpriteAnimation,
} from "../helpers";

import { Scene } from "../phaser";

export class AlpacaSpit {
  public object;

  constructor(scene: Scene, x: number, y: number) {
    const { key, info } = getSpriteSheet(
      scene.registry,
      "jurmo",
      "alpaca-spit"
    );
    this.object = scene.physics.add.sprite(x, y, key).setSize(8, 7);
    createSpriteAnimations(this.object, key, info);
    this.fly();
  }

  public async fly() {
    this.object.anims.play("fly");
  }

  public async splash() {
    await playSpriteAnimation(this.object, "splash", true);
    this.object.setVisible(false);
  }
}
