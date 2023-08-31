import { SpriteWithDynamicBody, Vector } from "../phaser";
import {
  createSpriteAnimations,
  getImageKey,
  playSpriteAnimation,
} from "../helpers";

import { ATLAS_KEY } from "../config";
import { Airplane } from "../sprite/airplane";
import { AirportPrince } from "../sprite/airport-prince";
import { Fireworks } from "../fireworks";
import { Scene } from "./scene";
import phaser from "phaser";

export class EndingScene extends Scene<void, void> {
  constructor() {
    super("ending");
  }

  private airplane?: Airplane;

  private kiss?: SpriteWithDynamicBody;

  private prince?: AirportPrince;

  public async create() {
    super.create();
    this.paintSky("light");
    this.addPlayer(56, 32);
    this.inputController!.deactivate(false);
    this.prince = new AirportPrince(this, 73, 35);
    this.prince.lookLeft();
    this.airplane = new Airplane(this, 24, 36);
    this.airplane.retractLandingGear(false);
    this.airplane.object.body.setAllowGravity(false);
    const { key, info } = this.getSpriteSheet("prince-kiss");
    this.kiss = this.physics.add
      .sprite(70, 36, key)
      .setOrigin(0)
      .setSize(17, 27)
      .setOffset(1, 1)
      .setVisible(false)
      .setFlipX(true);
    createSpriteAnimations(this.kiss, key, info);
    for (const sprite of [this.player!.object, this.prince.object, this.kiss]) {
      this.physics.add.collider(sprite, this.airplane!.object);
    }
    this.startClouds();
    await this.delay(1000);
    this.prince.lookAtCamera();
    await this.delay(500);
    for (const text of this.getText("prince", "thank-real-life-prince")) {
      await this.prince.say(text);
      await this.delay(500);
    }
    await this.delay(1000);
    this.fadeOutMusic(10000);
    this.prince.smile();
    await this.delay(1000);
    await this.player!.walkTo(this.prince.object.x + 5);
    this.player!.object.setX(this.player!.object.x + 1);
    await this.delay(200);
    await this.kissPrince();
    await this.delay(500);
    await this.fadeToNight();
    await this.delay(1000);
    this.startFireworks();
    await this.delay(12500);
    this.startPlane();
    await this.delay(15000);
    await this.fadeOut();
    await this.delay(2000);
    this.complete(true);
  }

  private createNightImage() {
    const { width, height } = this.renderer;
    const key = this.getImageKey("night");
    const texture = this.textures.createCanvas(key, width, height);
    const context = texture!.getContext();
    context.fillStyle = "rgb(16, 0, 48)";
    context.fillRect(0, 0, width, height);
    texture!.refresh();
    return this.add.image(0, 0, key).setOrigin(0, 0).setDepth(-5).setAlpha(0);
  }

  private createStarsImage() {
    const { width, height } = this.renderer;
    const key = this.getImageKey("stars");
    const texture = this.textures.createCanvas(key, width, height);
    const context = texture!.getContext();
    const rng = new phaser.Math.RandomDataGenerator(["Sis"]);
    for (let i = 0; i < 96; i++) {
      const alpha = rng.between(1, 3) / 12;
      const x = rng.integerInRange(0, width - 1);
      const y = rng.integerInRange(0, height - 1);
      if (rng.between(0, 1) === 1) {
        context.globalAlpha = alpha / 2;
        context.fillStyle = "#20f";
        context.fillRect(x + rng.between(-1, 0), y + rng.between(-1, 0), 2, 2);
      }
      context.globalAlpha = alpha;
      context.fillStyle = "#fff";
      context.fillRect(x, y, 1, 1);
    }
    texture!.refresh();
    return this.add.image(0, 0, key).setOrigin(0, 0).setDepth(-4).setAlpha(0);
  }

  private async fadeOut() {
    const rt = this.add
      .renderTexture(0, 0, this.renderer.width, this.renderer.height)
      .setOrigin(0)
      .fill(0x000000);
    for (let i = 0; i < 8; i++) {
      rt.setAlpha((i + 1) / 8);
      await this.delay(500);
    }
    this.sound.stopAll();
  }

  private async fadeToNight() {
    const nightImage = this.createNightImage();
    const starsImage = this.createStarsImage();
    for (let i = 0; i < 16; i++) {
      await this.delay(200);
      const ratio = (i + 1) / 16;
      nightImage.setAlpha(ratio);
      starsImage.setAlpha(Math.pow(ratio, 4));
    }
  }

  private async kissPrince() {
    this.player!.object.destroy();
    this.player = undefined;
    this.prince!.object.destroy();
    this.player = undefined;
    this.kiss!.setVisible(true);
    await playSpriteAnimation(this.kiss!, "kiss");
  }

  private async startClouds() {
    const createCloud = (x: number, y: number, index: number) => {
      this.physics.add
        .image(x, y, ATLAS_KEY, getImageKey("global", "cloud-" + index))
        .setDepth(this.airplane!.object.depth - 1)
        .setVelocityX(32)
        .body.setAllowGravity(false);
    };
    createCloud(16, 100, 1);
    createCloud(-128, 80, 2);
    await this.delay(4000);
    createCloud(-128, 0, 1);
  }

  private async startFireworks() {
    const rng = new phaser.Math.RandomDataGenerator(["pyro"]);
    const camera = this.cameras.main;
    const fireworks = new Fireworks(this, "particles", { min: -2, max: -1 });
    const launchLocations = Array.from(
      { length: 5 },
      (_value: undefined, index: number) =>
        new Vector((camera.width / 6) * (index + 1), camera.height)
    );
    const colors = [0xcc0033, 0xffdd00, 0x00cc66, 0x99ccff, 0x9933ff];
    let active = true;
    const start = async () => {
      let delay = 2000;
      while (active) {
        fireworks.launchRocket(
          rng.pick(launchLocations),
          96,
          20,
          rng.between(-8, 8),
          rng.realInRange(0, 1500),
          rng.pick(colors)
        );
        await this.delay(rng.between(0, delay), true);
        delay = Math.max(500, delay - 50);
      }
    };
    await Promise.race([start(), this.delay(21000, true)]);
    active = false;
  }

  private async startPlane() {
    const accelerate = (acceleration: number) => {
      this.airplane!.object.setAccelerationX(acceleration);
      this.kiss!.setAccelerationX(acceleration);
    };
    for (let i = 0; i < 3; i++) {
      accelerate(-16 - i * 4);
      await this.delay(1000);
    }
    accelerate(0);
  }

  public update(time: number, delta: number) {
    if (this.isComplete) {
      return;
    }
    super.update(time, delta);
  }
}
