import { Scene, SpriteWithDynamicBody } from "../phaser";
import {
  createSpriteAnimations,
  delay,
  events,
  getSound,
  getSpriteSheet,
  playRandomStepSound,
  playSpriteAnimation,
} from "../helpers";

import { Person } from "./person";
import { Vector } from "../phaser";
import { colors } from "../config";

const soundConfigs = {
  run: { volume: 3 / 16 },
  land: { volume: 6 / 16 },
};

const enum State {
  Idle,
  Jump,
  Run,
}

export class AirportPrince extends Person<SpriteWithDynamicBody> {
  private jumpSound;

  private jumpSpeed = 224;

  public mute = false;

  private runSoundIdentifier: Symbol | null = null;

  private runSpeed = 80;

  private runUpdate?: () => void;

  private state = State.Idle;

  constructor(scene: Scene, x: number, y: number) {
    const { key, info } = getSpriteSheet(scene.registry, "airport", "prince");
    super(scene.physics.add.sprite(x, y, key).setOrigin(0));
    this.setBalloonColors({
      fill: colors.emerald,
      text: colors.white,
    })
      .setBalloonOffset(new Vector(1, -5))
      .setMaxCharsPerLine(24);
    this.object.setSize(19, 28).setOffset(1, 1);
    createSpriteAnimations(this.object, key, info);
    for (const key of ["jump", "run"]) {
      this.object.anims.get(key).repeat = -1;
    }
    this.jumpSound = getSound(scene, "jump", { volume: 1 / 8 });
    this.idle();
    scene.events.on(events.scene.postUpdate, () => {
      this.balloon?.update();
    });
  }

  public async beShocked() {
    return playSpriteAnimation(this.object, "shock");
  }

  public idle() {
    this.object.setVelocityX(0);
    this.object.anims.play("idle", true);
    this.state = State.Idle;
  }

  public isOnFloor() {
    return this.object.body.onFloor();
  }

  public async jump() {
    this.object.setVelocityX(
      1.5 * Math.sign(this.object.body.velocity.x) * this.runSpeed
    );
    this.object.setVelocityY(-this.jumpSpeed);
    this.object.anims.play("jump");
    if (!this.mute) {
      this.jumpSound.play();
    }
    this.state = State.Jump;
    await this.onFloor();
    if (!this.mute) {
      playRandomStepSound(this.object.scene, soundConfigs.land);
    }
  }

  public lookAtCamera() {
    this.object.anims.play("look");
  }

  public lookLeft() {
    this.object.setFlipX(true);
  }

  public lookRight() {
    this.object.setFlipX(false);
  }

  public async loseRing() {
    return playSpriteAnimation(this.object, "lost", true);
  }

  public async onFloor() {
    const update = () => {
      if (this.isOnFloor()) {
        this.object.scene.physics.world.off(events.world.step, update);
        resolvePromise();
      }
    };
    this.object.scene.physics.world.on(events.world.step, update);
    let resolvePromise: () => void;
    return new Promise<void>(resolve => {
      resolvePromise = resolve;
    });
  }

  public async playRunSounds() {
    if (this.runSoundIdentifier !== null) {
      return;
    }
    this.runSoundIdentifier = Symbol();
    const identifier = this.runSoundIdentifier;
    await delay(this.object.scene, 200, true);
    while (this.state === State.Run && identifier === this.runSoundIdentifier) {
      playRandomStepSound(this.object.scene, soundConfigs.run);
      await delay(this.object.scene, 400, true);
    }
    if (this.state !== State.Run) {
      this.runSoundIdentifier = null;
    }
  }

  public async runLeft() {
    this.run(-1);
  }

  public async runRight() {
    this.run(1);
  }

  private run(direction: number) {
    this.object.setFlipX(direction === -1);
    this.object.anims.play("run");
    this.object.scene.physics.world.off(events.world.step, this.runUpdate);
    this.runUpdate = () => {
      if (direction * this.object.body.velocity.x < 0) {
        this.object.setAccelerationX(8 * direction * this.runSpeed);
      } else if (Math.abs(this.object.body.velocity.x) >= this.runSpeed) {
        this.object.setAccelerationX(0);
        this.object.body.setVelocityX(direction * this.runSpeed);
        this.object.scene.physics.world.off(events.world.step, this.runUpdate);
      } else {
        this.object.setAccelerationX(2 * direction * this.runSpeed);
      }
    };
    this.object.scene.physics.world.on(events.world.step, this.runUpdate);
    this.runSoundIdentifier = null;
    if (!this.mute) {
      this.playRunSounds();
    }
    this.state = State.Run;
  }

  public smile() {
    this.object.setVelocityX(0);
    this.object.anims.play("smile", true);
  }

  public async takeRingOut() {
    await playSpriteAnimation(this.object, "ring");
  }
}
