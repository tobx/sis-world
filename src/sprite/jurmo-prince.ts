import { Scene, SpriteWithDynamicBody } from "../phaser";
import {
  createSpriteAnimations,
  delay,
  getSpriteSheet,
  playRandomStepSound,
} from "../helpers";

import { Person } from "./person";
import { Vector } from "../phaser";
import { colors } from "../config";

const enum State {
  Idle,
  Run,
}

export class JurmoPrince extends Person<SpriteWithDynamicBody> {
  private runSoundIdentifier: Symbol | null = null;

  private runSoundConfig = { volume: 3 / 16 };

  private runSpeed = 64;

  private state = State.Idle;

  constructor(scene: Scene, x: number, y: number) {
    const { key, info } = getSpriteSheet(scene.registry, "jurmo", "prince");
    super(
      scene.physics.add
        .sprite(x, y, key)
        .setOrigin(0)
        .setSize(11, 28)
        .setOffset(5, 1)
    );
    createSpriteAnimations(this.object, key, info);
    this.object.anims.get("run").repeat = -1;
    this.setBalloonColors({
      fill: colors.emerald,
      text: colors.white,
    }).setBalloonOffset(new Vector(1, -5));
    this.smile();
  }

  public set runSoundVolume(value: number) {
    this.runSoundConfig.volume = value;
  }

  public idle() {
    this.object.setVelocityX(0);
    this.object.anims.play("idle");
    this.state = State.Idle;
  }

  public smile() {
    this.object.anims.play("smile");
  }

  private async run(direction: number) {
    this.object
      .setFlipX(direction === -1)
      .setVelocityX(direction * this.runSpeed);
    this.object.anims.play("run");
    this.runSoundIdentifier = null;
    this.playRunSounds();
    this.state = State.Run;
  }

  public async runLeft() {
    this.run(-1);
  }

  public async runRight() {
    this.run(1);
  }

  public lookLeft() {
    this.object.setFlipX(true);
  }

  public lookRight() {
    this.object.setFlipX(false);
  }

  public async playRunSounds() {
    if (this.runSoundIdentifier !== null) {
      return;
    }
    this.runSoundIdentifier = Symbol();
    const identifier = this.runSoundIdentifier;
    await delay(this.object.scene, 200, true);
    while (this.state === State.Run && identifier === this.runSoundIdentifier) {
      playRandomStepSound(this.object.scene, this.runSoundConfig);
      await delay(this.object.scene, 400, true);
    }
    if (this.state !== State.Run) {
      this.runSoundIdentifier = null;
    }
  }

  public update() {
    this.balloon?.update();
  }
}
