import {
  TimedLoop,
  createSpriteAnimations,
  events,
  getSpriteSheet,
  playSpriteAnimation,
} from "../helpers";

import { Scene } from "../phaser";
import { Vector } from "../phaser";

const movements: ["left" | "right" | "wait", number][] = [
  ["wait", 500],
  ["left", 500],
  ["wait", 2000],
  ["left", 1000],
  ["wait", 3000],
  ["right", 500],
  ["wait", 1500],
  ["left", 2000],
  ["wait", 2000],
  ["right", 1700],
  ["wait", 1000],
  ["right", 1300],
  ["wait", 500],
];

const enum State {
  Idle,
  Hop,
  Run,
  Sleep,
  WakeUp,
}

export class Rabbit {
  private _state = State.Idle;

  private hopSpeed = 24;

  private runSpeed = 48;

  private movementLoop;

  public object;

  private sleepingTextObject;

  private sleepingTextOffset = new Vector(0, -9);

  private update;

  constructor(scene: Scene, x: number, y: number) {
    {
      const { key, info } = getSpriteSheet(scene.registry, "home", "rabbit");
      this.object = scene.physics.add
        .sprite(x, y, key)
        .setOrigin(0)
        .setSize(8, 7);
      createSpriteAnimations(this.object, key, info);
    }
    for (const key of ["hop", "idle", "sleep"]) {
      this.object.anims.get(key).repeat = -1;
    }
    {
      const { key, info } = getSpriteSheet(
        scene.registry,
        "home",
        "sleeping-text-animation"
      );
      this.sleepingTextObject = scene.add
        .sprite(0, 0, key)
        .setOrigin(0)
        .setSize(8, 12)
        .setVisible(false);
      createSpriteAnimations(this.sleepingTextObject, key, info);
    }
    this.sleepingTextObject.anims.get("animate").repeat = -1;
    this.movementLoop = this.createMovementLoop();
    this.update = () => {
      this.sleepingTextObject.setPosition(
        this.object.x + this.sleepingTextOffset.x,
        this.object.y + this.sleepingTextOffset.y
      );
    };
    scene.events.on(events.scene.postUpdate, this.update);
    this.update();
    this.idle();
  }

  public get isIdle() {
    return this.state === State.Idle;
  }

  public get isSleeping() {
    return this.state === State.Sleep;
  }

  private get state() {
    return this._state;
  }

  private set state(value: State) {
    if (value === State.Sleep) {
      this.sleepingTextObject.anims.play("animate");
      this.sleepingTextObject.setVisible(true);
    } else {
      this.sleepingTextObject.anims.stop();
      this.sleepingTextObject.setVisible(false);
    }
    this._state = value;
  }

  public getCenter() {
    return this.object.getCenter() as Vector;
  }

  public hopLeft() {
    this.movementLoop.stop();
    this._hopLeft();
  }

  private _hopLeft() {
    this.state = State.Hop;
    this.object
      .setFlipX(false)
      .setVelocityX(-this.hopSpeed)
      .anims.play("hop", true);
  }

  public hopRight() {
    this.movementLoop.stop();
    this._hopRight();
  }

  private _hopRight() {
    this.state = State.Hop;
    this.object
      .setFlipX(true)
      .setVelocityX(this.hopSpeed)
      .anims.play("hop", true);
  }

  public hopAround() {
    if (this.movementLoop.isStopped) {
      this.movementLoop.start(this.object);
    }
  }

  public idle() {
    this.movementLoop.stop();
    this._idle();
  }

  private _idle() {
    this.state = State.Idle;
    this.object.setVelocityX(0);
    this.object.anims.play("idle");
  }

  public remove() {
    this.object.scene.events.off(events.scene.postUpdate, this.update);
    this.object.destroy();
    this.sleepingTextObject.destroy();
  }

  public runLeft() {
    this.movementLoop.stop();
    this.state = State.Run;
    this.object
      .setFlipX(false)
      .setVelocityX(-this.runSpeed)
      .anims.play("hop", true);
  }

  public runRight() {
    this.movementLoop.stop();
    this.state = State.Run;
    this.object
      .setFlipX(true)
      .setVelocityX(this.runSpeed)
      .anims.play("hop", true);
  }

  public sleep() {
    this.movementLoop.stop();
    this.state = State.Sleep;
    this.object.setVelocityX(0);
    this.object.anims.play("sleep");
  }

  public async wakeUp() {
    if (this.state === State.Sleep) {
      this.movementLoop.stop();
      this.state = State.WakeUp;
      this.object.setVelocityX(0);
      await playSpriteAnimation(this.object, "wake-up", true);
      if (this.state === State.WakeUp) {
        this.hopAround();
      }
    }
  }

  private createMovementLoop() {
    const mapping: { [key: string]: () => void } = {
      left: () => this.hopLeft(),
      right: () => this.hopRight(),
      wait: () => this.idle(),
    };
    return new TimedLoop(
      movements.map(([action, duration]) => [mapping[action]!, duration])
    );
  }
}
