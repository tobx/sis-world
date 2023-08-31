import { BitmapText, RenderTexture } from "../phaser";
import { MultilineText, defaultTextDuration } from "../text";
import { Scene, notificationEvents } from "./scene";
import { colors, fonts } from "../config";

import { ColorOptions } from "../sprite/balloon";
import phaser from "phaser";

export type Note = {
  text: MultilineText;
  duration?: number;
};

export class NotificationScene extends Scene<void, void> {
  private background?: RenderTexture;

  private colors: ColorOptions = {
    fill: colors.yellow,
    line: colors.black,
  };

  private lineWidth = 1;

  private text?: BitmapText;

  private paddingY = 2;

  // looks best on Chrome, Firefox and iOS
  private radius = 3.25;

  private textColor = colors.black;

  private transitionDuration = 500;

  constructor() {
    super("notification", false);
  }

  public create() {
    super.create();
    this.background = this.add
      .renderTexture(4, -1, this.renderer.width - 8, this.renderer.height + 1)
      .setOrigin(0)
      .setVisible(false);
    this.background.draw(
      this.drawBackground(this.background.width, this.background.height),
      this.lineWidth / 2,
      this.lineWidth / 2
    );

    // disable listener from previous scene start
    this.eventCenter.off(
      notificationEvents.notification,
      this.handleNotification,
      this
    );

    this.eventCenter.on(
      notificationEvents.notification,
      this.handleNotification,
      this
    );
  }

  private drawBackground(width: number, height: number) {
    width = width - this.lineWidth;
    height = height - this.lineWidth;
    const pi = Math.PI;
    const r = this.radius;
    const epsilon = phaser.Math.EPSILON;
    return this.make
      .graphics()
      .lineStyle(this.lineWidth, this.colors.line!)
      .fillStyle(this.colors.fill!)
      .beginPath()
      .moveTo(0, 0)
      .lineTo(0, height - r)
      .arc(r, height - r, r, pi, 0.5 * pi, true)
      .lineTo(width - r, height)
      .arc(width - r, height - r, r, 0.5 * pi, 0, true)
      .lineTo(width, height - r + epsilon)
      .lineTo(width, 0)
      .closePath()
      .fillPath()
      .strokePath();
  }

  private async handleNotification(note: Note) {
    if (!this.scene.isActive()) {
      this.eventCenter.off(
        notificationEvents.notification,
        this.handleNotification,
        this
      );
      return;
    }
    this.text?.destroy();
    this.text = this.add
      .bitmapText(0, 0, fonts.normal, note.text)
      .setTint(this.textColor);
    const transitionHeight = Math.min(
      this.background!.height - 1,
      this.text.height + 2 * this.paddingY
    );
    this.text.setPosition(
      this.screenCenter.x - this.text.width / 2,
      this.paddingY - transitionHeight
    );
    this.background!.setY(-this.background!.height);
    this.background!.setVisible(true);
    await this.slideIn(transitionHeight);
    await this.delay(note.duration ?? defaultTextDuration(note.text));
    await this.slideOut(transitionHeight);
    this.text.destroy();
    this.text = undefined;
    this.background!.setVisible(false);
    this.eventCenter.emit(notificationEvents.complete, note);
  }

  private async slideIn(transitionHeight: number) {
    await this.addTween({
      targets: [this.background!, this.text],
      y: "+=" + transitionHeight,
      duration: this.transitionDuration,
      ease: phaser.Math.Easing.Quadratic.Out,
    });
  }

  private async slideOut(transitionHeight: number) {
    await this.addTween({
      targets: [this.background!, this.text],
      y: "-=" + transitionHeight,
      duration: 500,
      ease: phaser.Math.Easing.Quadratic.In,
    });
  }
}
