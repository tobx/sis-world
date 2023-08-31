import {
  createSpriteAnimations,
  delay,
  events,
  getSpriteSheet,
  playSpriteAnimation,
} from "../helpers";

import { Scene } from "../phaser";

const enum State {
  Bounce,
  Idle,
}

export class Alpaca {
  private bounceSpeed = 96;

  private walkSpeed = 64;

  private state = State.Idle;

  public object;

  private bounceIdentifier: Symbol | null = null;

  private jumpSoundConfig = { volume: 0 };

  constructor(scene: Scene, x: number, y: number) {
    const { key, info } = getSpriteSheet(scene.registry, "jurmo", "alpaca");
    this.object = scene.physics.add
      .sprite(x, y, key)
      .setOrigin(0)
      .setSize(22, 28)
      .setOffset(1, 1);
    createSpriteAnimations(this.object, key, info);
    this.idle();
  }

  public set jumpSoundVolume(value: number) {
    this.jumpSoundConfig.volume = value;
  }

  public async idle() {
    this.bounceIdentifier = null;
    await this.onFloor();
    this.object.setVelocityX(0).anims.play("idle");
    this.state = State.Idle;
  }

  private isOnFloor() {
    return this.object.body.onFloor();
  }

  private async bounce(direction: "left" | "right") {
    const bounceIdentifier = Symbol();
    this.bounceIdentifier = bounceIdentifier;
    const directionSign = direction === "right" ? 1 : -1;
    const walkSpeed = directionSign * this.walkSpeed;
    this.state = State.Bounce;
    while (
      this.state === State.Bounce &&
      bounceIdentifier === this.bounceIdentifier
    ) {
      this.object.setFlipX(direction === "left");
      this.object.setVelocityX(walkSpeed);
      playSpriteAnimation(this.object, "bounce");
      await delay(this.object.scene, 75, true);
      if (
        this.state === State.Bounce &&
        bounceIdentifier === this.bounceIdentifier
      ) {
        this.object.setVelocityY(-this.bounceSpeed);
        this.object.scene.sound.play("alpaca-jump", this.jumpSoundConfig);
      }
      await this.onFloor();
    }
  }

  public async bounceLeft() {
    this.bounce("left");
  }

  public async bounceRight() {
    this.bounce("right");
  }

  public lookLeft() {
    this.object.setFlipX(true);
  }

  public lookRight() {
    this.object.setFlipX(false);
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
}
