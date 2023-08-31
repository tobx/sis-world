import { createSpriteAnimations, getSpriteSheet } from "../helpers";

import { Scene } from "../phaser";
import phaser from "phaser";

export class WaterDispenser {
  public object;

  private _waterLevel = 0;

  constructor(scene: Scene, x: number, y: number) {
    const { key, info } = getSpriteSheet(
      scene.registry,
      "global",
      "water-dispenser"
    );
    this.object = scene.physics.add
      .staticSprite(x, y, key)
      .setOrigin(0)
      .setSize(7, 23);
    this.object.body.setOffset(this.object.width / 2, this.object.height / 2);
    createSpriteAnimations(this.object, key, info);
    for (const key of ["1-quarter", "half", "3-quarters", "full"]) {
      this.object.anims.get(key).repeat = -1;
    }
    this.waterLevel = 0;
  }

  public get waterLevel() {
    return this._waterLevel;
  }

  public set waterLevel(fraction: number) {
    this._waterLevel = phaser.Math.Clamp(fraction, 0, 1);
    let i;
    for (i = 0; i / 4 + 0.125 <= this._waterLevel; i++);
    const key = ["empty", "1-quarter", "half", "3-quarters", "full"][i]!;
    this.object.anims.play(key, true);
  }

  public get isEmpty() {
    return this._waterLevel === 0;
  }

  public removePlasticCup() {
    this.object.anims.play("no-cup");
  }
}
