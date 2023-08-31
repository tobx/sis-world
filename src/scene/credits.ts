import { ATLAS_KEY, colors, fonts, sceneKeys, themeMarkers } from "../config";
import {
  BitmapText,
  Image,
  ImageWithDynamicBody,
  Sprite,
  Zone,
} from "../phaser";
import {
  createSpriteAnimations,
  easing,
  getImageKey,
  playSpriteAnimation,
} from "../helpers";

import { AirportPrince } from "../sprite/airport-prince";
import { Farmer } from "../sprite/farmer";
import { ImageBase } from "./boot";
import { MultilineText } from "../text";
import { Player } from "../sprite/player";
import { Options as RectTransitionOptions } from "./rect-transition";
import { Scene } from "./scene";
import { Vector } from "../phaser";
import phaser from "phaser";

type ActionKey =
  | "end-other-people-animation"
  | "end-phaser-dude-animation"
  | "end-player-animation"
  | "end-prince-animation"
  | "start-other-people-animation"
  | "start-phaser-dude-animation"
  | "start-player-animation"
  | "start-prince-animation";

const GAP_DURATION = 667;

const TEXT_DURATION = 3333;

const CREDITS: {
  text: MultilineText;
  description?: MultilineText;
  font?: string;
  duration?: number;
  startActionKey?: ActionKey;
  endActionKey?: ActionKey;
  offsetY?: number;
}[] = [
  { text: "Sis World", font: fonts.title },
  {
    description: "Art, Code, Music & Sound",
    text: "Tobx",
    startActionKey: "start-prince-animation",
    endActionKey: "end-prince-animation",
  },
  {
    description: "Inspiration",
    text: "Sis",
    startActionKey: "start-player-animation",
    endActionKey: "end-player-animation",
  },
  {
    description: "Special thanks to",
    text: "the phaser.io community",
    startActionKey: "start-phaser-dude-animation",
    endActionKey: "end-phaser-dude-animation",
  },
  {
    text: "Sis World",
    font: fonts.title,
    startActionKey: "start-other-people-animation",
    offsetY: -8,
  },
  {
    text: "a ts Games Production",
    endActionKey: "end-other-people-animation",
    offsetY: -8,
  },
  {
    text: ["(c) 2023 Die Maus AG.", "All Rights Reserved."],
    duration: 6000,
  },
];

export class CreditsScene extends Scene<void, ActionKey> {
  private couple?: Image;

  private center?: Vector;

  private phaserDude?: ImageWithDynamicBody;

  private prince?: AirportPrince;

  private otherPeople?: phaser.GameObjects.Container;

  constructor() {
    super("credits");
  }

  public async create() {
    // required to pause the game
    this.addControls();

    this.center = this.screenCenter;
    const theme = this.getThemeMusic();
    for (const [delay, f] of [
      [0, () => theme.play(themeMarkers.ending)],
      [0, () => this.displayCredits()],
      [32000, () => this.showLake()],
      [41200, () => this.createBabyAnimation()], // 48000 - baby animation length
      [60000, () => this.playEndTransition()],
    ] as [number, () => void][]) {
      this.time.delayedCall(delay, f);
    }
    const { width, height } = this.renderer;
    const zones = this.physics.add
      .staticGroup()
      .add(new Zone(this, -64, 40, 96, 16).setOrigin(0))
      .add(new Zone(this, width - 64, height + 32, 64, 32).setOrigin(0))
      .add(new Zone(this, 0, height + 40, width, 32).setOrigin(0));
    this.player = new Player(this, -15, 8, true);
    this.player.object.body.setCollideWorldBounds(false);
    this.player.mute = true;
    this.prince = new AirportPrince(this, width - 40, 111);
    this.prince.mute = true;
    this.phaserDude = this.physics.add
      .image(this.center!.x, 0, ATLAS_KEY, this.getImageKey("phaser-dude"))
      .setOrigin(0.5, 1)
      .setFlipY(true);
    this.phaserDude.body
      .setGravityY(-2 * this.physics.world.gravity.y)
      .setAllowGravity(false);
    this.physics.add.collider(this.player!.object, zones);
    this.physics.add.collider(this.prince.object, zones);
    this.physics.add.collider(this.phaserDude, zones);
    const otherPeopleDef: [ImageBase, string][] = [
      ["fifth-floor", "chubby-woman"],
      ["airport", "protester"],
      ["jurmo", "farmer"],
      ["airport", "business-guy"],
      ["global", "state-officer"],
    ];
    this.otherPeople = this.add.container().add(
      otherPeopleDef.map(([base, name], index) => {
        const x = ((index + 1) * width) / (otherPeopleDef.length + 1);
        const y = height - 4;
        const object =
          base === "jurmo" && name === "farmer"
            ? new Farmer(this, x, y).object
            : this.add.image(x, y, ATLAS_KEY, getImageKey(base, name));
        return object.setOrigin(0.5, 1).setVisible(false);
      })
    );
    this.createActions();
  }

  private createActions() {
    this.createAction("start-player-animation", () =>
      this.startPlayerAnimation()
    );
    this.createAction("end-player-animation", () => this.endPlayerAnimation());
    this.createAction("start-prince-animation", () =>
      this.startPrinceAnimation()
    );
    this.createAction("end-prince-animation", () => this.endPrinceAnimation());
    this.createAction("start-phaser-dude-animation", () =>
      this.startPhaserDudeAnimation()
    );
    this.createAction("end-phaser-dude-animation", () =>
      this.endPhaserDudeAnimation()
    );
    this.createAction("start-other-people-animation", () =>
      this.startOtherPeopleAnimation()
    );
    this.createAction("end-other-people-animation", () =>
      this.endOtherPeopleAnimation()
    );
  }

  private async startPlayerAnimation() {
    this.player!.walkRight();
    await this.delay((1000 / 60) * 24, true);
    this.player!.idle(13);
    await this.delay(100, true);
    this.player!.idle(14);
  }

  private async endPlayerAnimation() {
    this.player!.walkRight();
    this.player!.jump();
  }

  private async startPrinceAnimation() {
    this.prince!.lookLeft();
    this.prince!.jump();
    while (this.prince!.object.body.velocity.y < -phaser.Math.EPSILON) {
      await this.nextWorldStep();
    }
    this.prince!.object.setVelocity(0).body.setAllowGravity(false);
    await this.delay(TEXT_DURATION, true);
    this.prince!.object.body.setAllowGravity(true);
  }

  private async endPrinceAnimation() {
    this.prince!.object.body.setAllowGravity(true);
  }

  private async startPhaserDudeAnimation() {
    await this.delay(TEXT_DURATION / 2, false);
    this.phaserDude!.body.setAllowGravity(true).setVelocityY(146);
    while (this.phaserDude!.body.velocity.y > phaser.Math.EPSILON) {
      await this.nextWorldStep();
    }
    this.phaserDude!.setVelocity(0).body.setAllowGravity(false);
  }

  private async endPhaserDudeAnimation() {
    this.phaserDude!.body.setAllowGravity(true);
  }

  private async startOtherPeopleAnimation() {
    for (const object of this.otherPeople!.getAll<Image | Sprite>()) {
      await this.delay(1000 / 6, true);
      object.setVisible(true);
    }
  }

  private async endOtherPeopleAnimation() {
    this.otherPeople!.setVisible(false);
  }

  private async displayCredits() {
    for (const {
      text,
      description,
      font = fonts.normal,
      duration = TEXT_DURATION,
      startActionKey,
      endActionKey,
      offsetY,
    } of CREDITS) {
      const textObject = this.displayText(text, colors.yellow, font, offsetY);
      let descriptionObject: BitmapText | undefined;
      if (description !== undefined) {
        descriptionObject = this.displayText(description, colors.orange, font);
        const offset =
          (descriptionObject.fontSize + descriptionObject.lineSpacing) / 2 +
          (offsetY ?? 0);
        descriptionObject.setY(
          this.center!.y - descriptionObject.height / 2 - offset
        );
        textObject.setY(this.center!.y - textObject.height / 2 + offset);
      }
      if (startActionKey !== undefined) {
        this.getAction(startActionKey)!.execute();
      }
      await this.delay(duration);
      textObject.destroy();
      descriptionObject?.destroy();
      if (endActionKey !== undefined) {
        this.getAction(endActionKey)!.execute();
      }
      await this.delay(GAP_DURATION);
    }
  }

  private async playEndTransition() {
    const offset = new Vector(1, 0);
    const toPosition: Vector = this.couple!.getCenter();
    toPosition.x -= 1;
    toPosition.subtract(this.cameras.main.worldView).add(offset);
    const stopPosition = toPosition;
    const endPosition = toPosition.clone().add({ x: 7, y: 0 });
    const stopDimensions = new Vector(
      this.couple!.width + 3,
      this.couple!.height + 2
    );
    await new Promise<void>(resolve => {
      const options: RectTransitionOptions = {
        toDimensions: stopDimensions,
        toPosition: stopPosition,
        ease: easing.sine.in,
        duration: 1667,
        callback: resolve,
      };
      this.scene
        .launch(sceneKeys.rectTransition, options)
        .bringToTop(sceneKeys.rectTransition);
    });
    await this.delay(1333);
    await new Promise<void>(resolve => {
      const options: RectTransitionOptions = {
        fromDimensions: stopDimensions,
        fromPosition: stopPosition,
        toPosition: endPosition,
        duration: 333,
        callback: resolve,
      };
      this.scene.launch(sceneKeys.rectTransition, options);
    });
    await this.delay(2667);
    this.scene.stop(sceneKeys.rectTransition);
    this.add
      .renderTexture(0, 0, this.renderer.width, this.renderer.height)
      .setOrigin(0)
      .fill(colors.black);
    const text = this.displayText(
      "to be continued...",
      colors.white,
      fonts.normal
    );
    await this.delay(5000);
    text.destroy();
    await this.delay(3000);
    this.restartGame();
  }

  private async createBabyAnimation() {
    const { key, info } = this.getSpriteSheet("baby");
    const x = 152;
    const baby = this.add.sprite(x, 85, key).setOrigin(0).setSize(16, 13);
    createSpriteAnimations(baby, key, info);
    for (let i = 6; i >= 0; i--) {
      baby.setX(x + i * 6);
      await playSpriteAnimation(baby, "crawl");
    }
    await playSpriteAnimation(baby, "stand-up");
  }

  private createBirdAnimation() {
    const { key, info } = this.getSpriteSheet("birds", "title");
    const sprite = this.add
      .sprite(0, 52, key)
      .setOrigin(0)
      .setRotation(-Math.PI / 2)
      .setTint(colors.grayDark);
    createSpriteAnimations(sprite, key, info);
    sprite.anims.get("fly").repeat = -1;
    sprite.anims.play("fly");
  }

  private createBirdReflectionAnimation() {
    const { key, info } = this.getSpriteSheet("birds", "title");
    const sprite = this.add
      .sprite(0, 73, key)
      .setOrigin(0)
      .setRotation(-Math.PI / 2)
      .setTint(colors.grayDark)
      .setFlipX(true);
    createSpriteAnimations(sprite, key, info);
    sprite.anims.get("fly").repeat = -1;
    sprite.anims.play("fly");
  }

  private displayText(
    text: MultilineText,
    color: number,
    font: string,
    offsetY = 0
  ) {
    const textObject = this.add
      .bitmapText(0, 0, font, text, undefined, 1)
      .setTint(color)
      .setLineSpacing(2);
    return textObject.setPosition(
      this.center!.x - textObject.width / 2,
      this.center!.y - textObject.height / 2 + offsetY
    );
  }

  private showLake() {
    this.add.image(0, 45, ATLAS_KEY, this.getImageKey("lake")).setOrigin(0);
    this.createBirdReflectionAnimation();
    this.add
      .image(0, 0, ATLAS_KEY, this.getImageKey("reflection"))
      .setOrigin(0)
      .setScale(this.renderer.width, this.renderer.height);
    this.add
      .image(0, 0, ATLAS_KEY, this.getImageKey("background"))
      .setOrigin(0);
    this.add
      .image(0, 73, ATLAS_KEY, this.getImageKey("foreground"))
      .setOrigin(0);
    this.createBirdAnimation();
    this.couple = this.add
      .image(139, 78, ATLAS_KEY, this.getImageKey("couple"))
      .setOrigin(0);
  }
}
