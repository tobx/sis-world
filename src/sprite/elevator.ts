import { colors, fonts } from "../config";
import {
  createSpriteAnimations,
  delay,
  getSpriteSheet,
  playSpriteAnimation,
} from "../helpers";

import { Scene } from "../phaser";
import { Vector } from "../phaser";

export class Elevator {
  private _isOpen = false;

  public display;

  private displayColor = colors.yellowLight;

  private displayNegativeNumberOffset = new Vector(-4, 0);

  private displayOffset = new Vector(17, 2);

  private moveDelay = 1500;

  private startDelay = 1500;

  public object;

  constructor(
    scene: Scene,
    x: number,
    y: number,
    kind: "full" | "empty",
    private _currentFloor: number
  ) {
    const { key, info } = getSpriteSheet(
      scene.registry,
      "global",
      "elevator-" + kind
    );
    this.object = scene.add.sprite(x, y, key).setOrigin(0).setSize(34, 42);
    createSpriteAnimations(this.object, key, info);
    this.object.anims.play("closed");
    this.display = scene.add
      .bitmapText(0, 0, fonts.normal)
      .setTint(this.displayColor);
    this.updateDisplay();
  }

  public get currentFloor() {
    return this._currentFloor;
  }

  public get isOpen() {
    return this._isOpen;
  }

  public async goToFloor(targetFloor: number, startDelay?: number) {
    if (targetFloor === this._currentFloor) {
      return;
    }
    await delay(this.object.scene, startDelay ?? this.startDelay);
    const direction = targetFloor > this._currentFloor ? "up" : "down";
    while (this._currentFloor !== targetFloor) {
      await this.go(direction);
    }
  }

  public async open() {
    await playSpriteAnimation(this.object, "open");
    this._isOpen = true;
  }

  public async close() {
    this._isOpen = false;
    await playSpriteAnimation(this.object, "close");
  }

  private async go(direction: "up" | "down") {
    await delay(this.object.scene, this.moveDelay);
    this._currentFloor += direction === "up" ? 1 : -1;
    this.updateDisplay();
  }

  private updateDisplay() {
    const position = (this.object.getTopLeft() as Vector).add(
      this.displayOffset
    );
    if (this._currentFloor < 0) {
      position.add(this.displayNegativeNumberOffset);
    }
    this.display
      .setPosition(position.x, position.y)
      .setText(this._currentFloor.toString());
  }
}

export class Button {
  private active = false;

  private _pressCount = 0;

  public object;

  constructor(scene: Scene, x: number, y: number) {
    const { key, info } = getSpriteSheet(
      scene.registry,
      "global",
      "elevator-button"
    );
    this.object = scene.add.sprite(x, y, key).setOrigin(0).setSize(5, 7);
    createSpriteAnimations(this.object, key, info);
    this.object.anims.play("inactive");
  }

  public get pressCount() {
    return this._pressCount;
  }

  public press() {
    if (!this.active) {
      this.object.anims.play("active", true);
      this._pressCount++;
      this.active = true;
    }
  }

  public reset() {
    this.object.anims.play("inactive", true);
    this.active = false;
  }
}
