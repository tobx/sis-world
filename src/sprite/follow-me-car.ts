import {
  createSpriteAnimations,
  events,
  fadeSoundTo,
  getSound,
  getSpriteSheet,
  playSpriteAnimation,
} from "../helpers";

import { Scene } from "../phaser";
import { Vehicle } from "./vehicle";

const ENGINE_SOUND_VOLUME = 3 / 8;

const IDLE_ENGINE_SOUND_RATE = 5 / 6;

const MAX_SPEED = 96;

export class FollowMeCar extends Vehicle {
  private _hasDriver = false;

  private doorIsOpen = false;

  private sounds;

  private windowIsOpen = false;

  constructor(scene: Scene, x: number, y: number) {
    const { key, info } = getSpriteSheet(
      scene.registry,
      "airport",
      "follow-me-car"
    );
    const sprite = scene.physics.add
      .sprite(x, y, key)
      .setOrigin(0)
      .setSize(46, 24)
      .setOffset(1, 1)
      .setCollideWorldBounds(true);
    super(sprite, MAX_SPEED, 96, 192);
    createSpriteAnimations(this.object, key, info);
    const { anims } = this.object;
    anims.get("drive").repeat = -1;
    anims.play("window");
    anims.pause();
    this.sounds = {
      engine: getSound(scene, "car-engine", { loop: true }),
      engineStart: getSound(scene, "car-engine-start", { volume: 1 / 4 }),
      openDoor: getSound(scene, "car-door-open", { volume: 0.5 }),
      closeDoor: getSound(scene, "car-door-close", { volume: 1 / 3 }),
      window: getSound(scene, "car-window", { volume: 1 / 16 }),
    };
  }

  public get hasDriver() {
    return this._hasDriver;
  }

  public async closeDoor() {
    if (!this.windowIsOpen && this.doorIsOpen) {
      const key = this._hasDriver ? "door" : "door-empty";
      await playSpriteAnimation(this.object, key, true, true);
      this.sounds.closeDoor.play();
      if (this.doorIsOpen) {
        this.object.anims.play("window");
        this.object.anims.pause();
        this.doorIsOpen = false;
      }
    }
  }

  public async closeWindow() {
    if (this._hasDriver && this.windowIsOpen) {
      this.sounds.window.play();
      await playSpriteAnimation(this.object, "window", true, true);
      this.windowIsOpen = false;
    }
  }

  public driveLeft() {
    super.driveLeft();
    this.object.anims.play("drive", true);
  }

  public driveRight() {
    super.driveRight();
    this.object.anims.play("drive", true);
  }

  public enter() {
    if (this.doorIsOpen) {
      this.object.anims.playReverse("door");
      this.object.anims.pause();
    }
    this._hasDriver = true;
  }

  public exit() {
    if (this.doorIsOpen) {
      this.object.anims.playReverse("door-empty");
      this.object.anims.pause();
    }
    this._hasDriver = false;
  }

  public getEnterExitPosition() {
    return this.object.x + (this.targetsLeft ? 19 : this.object.width - 19);
  }

  public getHandleDoorPosition() {
    return this.object.x + (this.targetsLeft ? 27 : this.object.width - 27);
  }

  public idle() {
    if (super.idle()) {
      this.object.anims.playReverse("window", true);
      this.object.anims.pause();
      return true;
    }
    return false;
  }

  public async openDoor() {
    if (!this.windowIsOpen && !this.doorIsOpen) {
      const key = this._hasDriver ? "door" : "door-empty";
      this.sounds.openDoor.play();
      await playSpriteAnimation(this.object, key, true);
      this.doorIsOpen = true;
    }
  }

  public async openWindow() {
    if (this._hasDriver && !this.windowIsOpen) {
      this.sounds.window.play();
      await playSpriteAnimation(this.object, "window", true);
      this.windowIsOpen = true;
    }
  }

  public startCameraFollow() {
    const { width } = this.object.scene.renderer;
    this.object.scene.cameras.main
      .startFollow(
        this.object,
        false,
        undefined,
        undefined,
        -Math.floor(this.object.width / 2),
        0
      )
      .setDeadzone(width / 3, 0);
  }

  public async startEngine() {
    this.sounds.engine.setVolume(0).setRate(IDLE_ENGINE_SOUND_RATE).play();
    this.sounds.engineStart.play();
    await fadeSoundTo(
      this.object.scene,
      this.sounds.engine,
      ENGINE_SOUND_VOLUME,
      1000
    );
    this.object.scene.physics.world.on(events.world.step, this.update, this);
  }

  public async stopEngine() {
    this.object.scene.physics.world.off(events.world.step, this.update, this);
    await fadeSoundTo(this.object.scene, this.sounds.engine, 0, 100);
    this.sounds.engine.stop();
  }

  public get targetsLeft() {
    return this.object.flipX;
  }

  private update() {
    this.sounds.engine.setRate(
      IDLE_ENGINE_SOUND_RATE +
        Math.abs(this.object.body.velocity.x) / MAX_SPEED / 3
    );
  }
}
