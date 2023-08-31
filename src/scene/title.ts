import { ATLAS_KEY, colors, themeMarkers } from "../config";
import {
  Blinker,
  createSpriteAnimations,
  events,
  playSpriteAnimation,
} from "../helpers";

import { Scene } from "./scene";
import { controlEvents } from "../input";
import { registryKeys } from "../game";

export class TitleScene extends Scene<void, void> {
  constructor() {
    super("title", false);
  }

  public async create() {
    super.create();
    this.addControls();
    const screenCenter = this.screenCenter;
    this.add.image(0, 45, ATLAS_KEY, this.getImageKey("lake")).setOrigin(0);
    this.createWaterAnimation();
    this.createWaterReflectionAnimation({ x: 128, y: 74 }, 2000, 0);
    this.createWaterReflectionAnimation({ x: 159, y: 75 }, 2000);
    this.createWaterReflectionAnimation({ x: 140, y: 80 }, 2000, 1000);
    this.createBirdReflectionAnimation();
    this.add
      .image(0, 0, ATLAS_KEY, this.getImageKey("reflection"))
      .setOrigin(0);
    this.add
      .image(0, 0, ATLAS_KEY, this.getImageKey("background"))
      .setOrigin(0);
    this.add
      .image(0, 73, ATLAS_KEY, this.getImageKey("foreground"))
      .setOrigin(0);
    this.createBirdAnimation();
    const tobx = this.add
      .image(177, 104, ATLAS_KEY, this.getImageKey("tobx"))
      .setTint(colors.green)
      .setInteractive({ useHandCursor: true })
      .on(events.object.pointer.down, () =>
        window.open(
          this.registry.get(registryKeys.appInfo)!.author.url,
          "_blank"
        )
      )
      .on(events.object.pointer.over, () => tobx.setTint(colors.greenLight))
      .on(events.object.pointer.out, () => tobx.setTint(colors.green));
    await this.playMusic();
    this.add.image(
      screenCenter.x,
      32,
      ATLAS_KEY,
      this.getImageKey("description")
    );
    this.add.image(screenCenter.x, 56, ATLAS_KEY, this.getImageKey("title"));
    const pressStart = this.add
      .image(screenCenter.x, 86, ATLAS_KEY, this.getImageKey("start"))
      .setVisible(false);
    const pressStartZone = this.add
      .zone(pressStart.x, pressStart.y, pressStart.width, pressStart.height)
      .setInteractive({ useHandCursor: true })
      .on(events.object.pointer.down, () => {
        this.eventCenter.emit(controlEvents.startDown);
      });
    const pressStartBlinker = new Blinker(pressStart, 800);
    pressStartBlinker.blink();
    await this.controls!.start.pressed();
    pressStartZone.destroy();
    pressStartBlinker.stop();
    pressStart.destroy();
    this.eventCenter.emit(controlEvents.startUp);
    this.complete();
  }

  private createBirdAnimation() {
    const { key, info } = this.getSpriteSheet("birds");
    const sprite = this.add
      .sprite(0, 52, key)
      .setOrigin(0)
      .setRotation(-Math.PI / 2);
    createSpriteAnimations(sprite, key, info);
    sprite.anims.get("fly").repeat = -1;
    sprite.anims.play("fly");
  }

  private createBirdReflectionAnimation() {
    const { key, info } = this.getSpriteSheet("birds");
    const sprite = this.add
      .sprite(0, 73, key)
      .setOrigin(0)
      .setRotation(-Math.PI / 2)
      .setFlipX(true);
    createSpriteAnimations(sprite, key, info);
    sprite.anims.get("fly").repeat = -1;
    sprite.anims.play("fly");
  }

  private createWaterAnimation() {
    const { key, info } = this.getSpriteSheet("water-animation");
    const animation = this.add.sprite(159, 71, key);
    createSpriteAnimations(animation, key, info);
    animation.anims.get("move").repeat = -1;
    animation.anims.play("move");
  }

  private async createWaterReflectionAnimation(
    position: { x: number; y: number },
    delay: number,
    initialDelay?: number
  ) {
    const { key, info } = this.getSpriteSheet("water-reflection");
    const animation = this.add
      .sprite(position.x, position.y, key)
      .setVisible(false);
    createSpriteAnimations(animation, key, info);
    await this.delay(initialDelay ?? delay);
    do {
      animation.setVisible(true);
      await playSpriteAnimation(animation, "move");
      animation.setVisible(false);
      await this.delay(delay);
    } while (this.scene.isActive());
  }

  private async playMusic() {
    const intro = this.getIntroMusic();
    const theme = this.getThemeMusic();
    return new Promise<void>(resolve => {
      // try to start the loop as close as possible to the intro's end
      this.time.delayedCall(0, () => {
        intro.play(themeMarkers.intro);
      });
      this.time.delayedCall(4000, () => {
        theme.play(themeMarkers.loop);
        resolve();
      });
    });
  }
}
