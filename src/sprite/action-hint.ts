import { EventEmitter, Scene } from "../phaser";
import {
  createSpriteAnimations,
  delay,
  events,
  getSound,
  getSpriteSheet,
  playSpriteAnimation,
  until,
} from "../helpers";

import { controlEvents } from "../input";
import phaser from "phaser";
import { registryKeys } from "../game";

export class ActionHint {
  private eventCenter: EventEmitter;

  private hasAppeared = false;

  public object;

  private sound;

  constructor(scene: Scene) {
    const { key, info } = getSpriteSheet(scene.registry, "global", "action");
    this.eventCenter = scene.registry.get(registryKeys.eventCenter);
    this.object = scene.add
      .sprite(0, 0, key)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .on(events.object.pointer.down, this.handlePointerDown, this);
    createSpriteAnimations(this.object, key, info);
    this.object.anims.get("visible").repeat = -1;
    this.sound = getSound(scene, "action", { volume: 1 / 12 });
    this.appear();
  }

  public async activate() {
    this.sound.play();
    this.eventCenter.emit(controlEvents.actionUp);
    if (!this.hasAppeared) {
      await until(this.object.scene, () => this.hasAppeared);
    }
    await playSpriteAnimation(this.object, "activated");
    this.object.destroy();
  }

  public async cancel() {
    if (!this.hasAppeared) {
      await until(this.object.scene, () => this.hasAppeared);
    }
    await playSpriteAnimation(this.object, "zoom-out");
    this.object.destroy();
  }

  private async appear() {
    await playSpriteAnimation(this.object, "zoom-in");
    this.object.anims.play("visible");
    await delay(this.object.scene, 100, true);
    this.hasAppeared = true;
  }

  private handlePointerDown(
    _pointer: phaser.Input.Pointer,
    _localX: number,
    _localY: number,
    event: phaser.Types.Input.EventData
  ) {
    event.stopPropagation();
    this.eventCenter.emit(controlEvents.actionDown);
  }
}
