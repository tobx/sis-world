import { ATLAS_KEY, colors, fonts } from "../config";
import { BitmapText, Image } from "../phaser";

import { Scene } from "./scene";
import { getImageKey } from "../helpers";

export type Options = {
  title: string;
  pages: string[][];
};

export class SignScene extends Scene<Options, void> {
  private arrows?: { left: Image; right: Image };

  private currentPageIndex = 0;

  private currentPageText?: BitmapText;

  private pages: string[][] = [];

  constructor() {
    super("sign", false);
  }

  public create(options: Options) {
    super.create(options);
    const { title, pages } = options;
    this.currentPageIndex = 0;
    this.pages = pages;
    const addImage = (x: number, y: number, name: string) =>
      this.add
        .image(x, y, ATLAS_KEY, getImageKey("tutorial", name))
        .setOrigin(0);
    addImage(8, 8, "wood-sign-large");
    this.arrows = {
      left: addImage(27, 86, "wood-arrow-left").setVisible(false),
      right: addImage(156, 86, "wood-arrow-right").setVisible(false),
    };
    const titleText = this.add
      .bitmapText(0, 0, fonts.heading1, title)
      .setTint(colors.wood);
    titleText.setPosition(this.screenCenter.x - titleText.width / 2, 14);
    this.updateText();
    this.addControls();
    this.controls!.right.on("down", () => this.nextPage());
    this.controls!.left.on("down", () => this.previousPage());
  }

  private async nextPage() {
    this.currentPageIndex++;
    if (this.currentPageIndex < this.pages.length) {
      this.updateText();
    } else {
      this.scene.stop();
    }
  }

  private previousPage() {
    if (this.currentPageIndex === 0) {
      return;
    }
    this.currentPageIndex--;
    this.updateText();
  }

  private updateText() {
    this.currentPageText?.destroy();
    this.currentPageText = this.add
      .bitmapText(26, 35, fonts.normal, this.pages[this.currentPageIndex])
      .setTint(colors.wood);
    this.arrows!.left.setVisible(this.currentPageIndex > 0);
    this.arrows!.right.setVisible(
      this.currentPageIndex < this.pages.length - 1
    );
  }
}
