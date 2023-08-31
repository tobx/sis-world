import { GameObject, GetBounds } from "../phaser";
import { colors, fonts } from "../config";

import { MultilineText } from "../text";
import { Vector } from "../phaser";
import { createCenterAlignedBitmapText } from "../helpers";

export type Align = "auto" | "left" | "center" | "right";

export type ColorOptions = {
  text?: number;
  fill?: number;
  line?: number;
};

export class Balloon {
  private arrowWidth = 3;

  private lineWidth = 1;

  private padding = 2;

  // looks best on Chrome, Firefox and iOS
  private radius = 3.25;

  private texture;

  constructor(
    private object: GameObject & GetBounds,
    text: MultilineText,
    private offset: Vector = new Vector(),
    private colors: ColorOptions = {},
    private align: Align = "auto"
  ) {
    const position = (this.object.getTopCenter() as Vector).add(this.offset);
    const camera = this.object.scene.cameras.main;
    if (this.align === "auto") {
      const screenPosition = position.x - camera.worldView.x;
      if (screenPosition < camera.width / 3) {
        this.align = "left";
      } else if (screenPosition > (camera.width * 2) / 3) {
        this.align = "right";
      } else {
        this.align = "center";
      }
    }
    const textTexture = createCenterAlignedBitmapText(
      object.scene,
      fonts.normal,
      text,
      this.textColor
    ).setOrigin(0);
    const dimensionsOffset = 2 * (this.lineWidth + this.padding);
    let width = textTexture.width + dimensionsOffset;
    let textOffsetX = 0;
    const minWidth = 20;
    if (width < minWidth) {
      textOffsetX = Math.ceil((minWidth - width) / 2);
      width += 2 * textOffsetX;
    }
    const height = textTexture.height + dimensionsOffset;
    const graphics = this.drawBalloon(width, height);

    // fix balloon stuttering (discovered by trial and error)
    const textureWidth = width % 2 === 0 ? width + 1 : width;
    const textureHeight = height % 2 === 0 ? height + 1 : height;

    this.texture = object.scene.add
      .renderTexture(0, 0, textureWidth, textureHeight + this.arrowWidth)
      .setOrigin(0)
      .draw(graphics, this.lineWidth / 2, this.lineWidth / 2)
      .draw(
        textTexture,
        this.lineWidth + this.padding + textOffsetX,
        this.lineWidth + this.padding
      );
    this.update();
  }

  private get fillColor() {
    return this.colors.fill ?? colors.white;
  }

  private get lineColor() {
    return this.colors.line ?? colors.black;
  }

  private get textColor() {
    return this.colors.text ?? colors.black;
  }

  public destroy() {
    this.texture.destroy();
  }

  public setDepth(value: number) {
    this.texture.setDepth(value);
    return this;
  }

  public setOffset(x: number, y: number) {
    this.offset.set(x, y);
    this.update();
  }

  public update() {
    const position = (this.object.getTopCenter() as Vector).add(this.offset);
    switch (this.align) {
      case "left":
        position.x -= 4 * this.radius;
        position.x = Math.max(
          this.object.scene.cameras.main.worldView.x + 4,
          position.x
        );
        break;
      case "right":
        position.x += 4 * this.radius - this.texture.width;
        position.x = Math.min(
          this.object.scene.cameras.main.worldView.x +
            this.object.scene.renderer.width -
            4,
          position.x
        );
        break;
      default:
        position.x -= this.texture.width / 2;
        break;
    }
    this.texture.setPosition(
      // `Math.floor` is required to display the font correctly on iOS
      Math.floor(position.x),

      position.y - this.texture.height
    );
  }

  private drawBalloon(width: number, height: number) {
    width = width - this.lineWidth;
    height = height - this.lineWidth;
    const pi = Math.PI;
    const r = this.radius;
    const arrowPosition =
      this.align === "left"
        ? 4 * r
        : this.align === "right"
        ? width - 4 * r
        : Math.floor(width / 2);
    return this.object.scene.make
      .graphics(undefined, false)
      .lineStyle(this.lineWidth, this.lineColor)
      .fillStyle(this.fillColor)
      .beginPath()
      .moveTo(0, r)
      .arc(r, r, r, -pi, -0.5 * pi)
      .lineTo(width - r, 0)
      .arc(width - r, r, r, -0.5 * pi, 0)
      .lineTo(width, height - r)
      .arc(width - r, height - r, r, 0, 0.5 * pi)
      .lineTo(arrowPosition + this.arrowWidth, height)
      .lineTo(arrowPosition, height + this.arrowWidth)
      .lineTo(arrowPosition - this.arrowWidth, height)
      .lineTo(r, height)
      .arc(r, height - r, r, 0.5 * pi, pi)
      .closePath()
      .fillPath()
      .strokePath();
  }
}
