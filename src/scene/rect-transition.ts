import { RenderTexture, Vector } from "../phaser";

import { Scene } from "./scene";
import { colors } from "../config";
import { easing } from "../helpers";

export type Options = {
  fromDimensions?: Vector;
  fromPosition?: Vector;
  toDimensions?: Vector;
  toPosition?: Vector;
  color?: number;
  duration?: number;
  ease?: (value: number) => number;
  callback?: () => void;
};

type Rectangles = {
  top: RenderTexture;
  bottom: RenderTexture;
  left: RenderTexture;
  right: RenderTexture;
};

export class RectTransitionScene extends Scene<Options, void> {
  private rectangles?: Rectangles;

  constructor() {
    super("rect-transition", false);
  }

  public create(options: Options) {
    super.create(options);
    const color = options.color ?? colors.black;
    const duration = options.duration ?? 1000;
    const ease = options.ease ?? easing.linear;
    const { width, height } = this.cameras.main;
    const fromDimensions = options.fromDimensions ?? new Vector(width, height);
    const fromPosition =
      options.fromPosition ?? fromDimensions.clone().scale(0.5);
    const toPosition = options.toPosition ?? fromPosition.clone();
    const toDimensions = options.toDimensions ?? new Vector();
    const from = {
      x: fromPosition.x,
      y: fromPosition.y,
      xOffset: (width + fromDimensions.x) / 2,
      yOffset: (height + fromDimensions.y) / 2,
    };
    const to = {
      x: toPosition.x,
      y: toPosition.y,
      xOffset: (width + toDimensions.x) / 2,
      yOffset: (height + toDimensions.y) / 2,
    };
    if (this.rectangles !== undefined) {
      for (const rectangle of Object.values(this.rectangles)) {
        rectangle.destroy();
      }
    }
    this.rectangles = Object.fromEntries(
      Object.entries({
        top: [width / 2, from.y - from.yOffset],
        bottom: [width / 2, from.y + from.yOffset],
        left: [from.x - from.xOffset, height / 2],
        right: [from.x + from.xOffset, height / 2],
      } as { [key in keyof Rectangles]: [number, number] }).map(
        ([key, [x, y]]) => [
          key,
          this.add.renderTexture(x, y, width, height).fill(color),
        ]
      )
    ) as Rectangles;
    (async () => {
      await Promise.all([
        this.addTween({
          targets: this.rectangles!.top!,
          y: to.y - to.yOffset,
          duration,
          ease,
        }),
        this.addTween({
          targets: this.rectangles!.bottom!,
          y: to.y + to.yOffset,
          duration,
          ease,
        }),
        this.addTween({
          targets: this.rectangles!.left!,
          x: to.x - to.xOffset,
          duration,
          ease,
        }),
        this.addTween({
          targets: this.rectangles!.right!,
          x: to.x + to.xOffset,
          duration,
          ease,
        }),
      ]);
      options.callback?.();
    })();
  }
}
