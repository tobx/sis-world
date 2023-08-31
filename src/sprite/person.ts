import { Align, Balloon, ColorOptions } from "./balloon";
import { MultilineText, breakLines, defaultTextDuration } from "../text";

import { Image } from "../phaser";
import { Vector } from "../phaser";
import { delay } from "../helpers";

export class Person<T extends Image> {
  protected balloon?: Balloon;

  private balloonColors?: ColorOptions;

  private balloonOffset?: Vector;

  private maxCharsPerLine = 16;

  constructor(public object: T) {}

  public getCenter() {
    return this.object.getCenter() as Vector;
  }

  public async say(text: MultilineText, align?: Align) {
    this.balloon?.destroy();
    this.balloon = new Balloon(
      this.object,
      breakLines(text, this.maxCharsPerLine),
      this.balloonOffset,
      this.balloonColors,
      align
    ).setDepth(this.object.depth);
    const balloon = this.balloon;
    await delay(this.object.scene, defaultTextDuration(text));
    if (this.balloon === balloon) {
      this.balloon = undefined;
    }
    balloon.destroy();
  }

  public setBalloonColors(colors: ColorOptions) {
    this.balloonColors = colors;
    return this;
  }

  public setBalloonOffset(offset: Vector) {
    this.balloonOffset = offset;
    this.balloon?.setOffset(offset.x, offset.y);
    return this;
  }

  public setMaxCharsPerLine(value: number) {
    this.maxCharsPerLine = value;
    return this;
  }

  public unsay() {
    this.balloon?.destroy();
    this.balloon = undefined;
  }
}
