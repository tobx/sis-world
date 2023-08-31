import { Graphics, RenderTexture, Sprite } from "../phaser";
import { ImageObject, NoImageObject, Scene, ZoneObject } from "./scene";
import { colors, sceneKeys } from "../config";
import {
  createSpriteAnimations,
  easing,
  playSpriteAnimation,
} from "../helpers";

import { Action } from "../action";
import { AtacamaPrince } from "../sprite/atacama-prince";
import { Options as RectTransitionOptions } from "./rect-transition";
import phaser from "phaser";

type ActionKey =
  | "handle-player-out-of-photo-position"
  | "take-jump-photo"
  | "talk-to-prince";

const enum State {
  Exploring,
  TakingJumpPhoto,
  EndTransition,
}

export class AtacamaScene extends Scene<void, ActionKey> {
  private state = State.Exploring;

  private dimensions = { width: 384, height: 128 };

  private flashTexture?: RenderTexture;

  private jumpPhotoAttemptCount = 0;

  private jumpPhotoShootAborted = false;

  private photoFrame?: Graphics;

  private prince?: AtacamaPrince;

  private princeIsShooting = false;

  constructor() {
    super("atacama");
  }

  public create() {
    super.create();

    this.setBounds(this.dimensions.width, this.dimensions.height);

    this.paintSky("normal");

    this.addPlayer(16, 90);
    this.player!.startCameraFollow();
    this.player!.putOnBackpack();

    this.processTileMap("atacama", undefined, [
      "prince",
      "water-reflections-1",
      "water-reflections-2",
    ]);

    this.flashTexture = this.add
      .renderTexture(0, 0, this.renderer.width, this.renderer.height)
      .setOrigin(0)
      .setScrollFactor(0)
      .fill(colors.white)
      .setVisible(false);

    this.createActions();
  }

  public update(time: number, delta: number) {
    if (this.isComplete) {
      return;
    }
    super.update(time, delta);
    switch (this.state) {
      case State.Exploring:
        this.processActions("talk-to-prince");
        break;
      case State.TakingJumpPhoto:
        this.processActions(
          "handle-player-out-of-photo-position",
          "take-jump-photo"
        );
        break;
    }
  }

  private get playerIsInPhotoPosition() {
    return this.player!.object.x > 312 && this.player!.object.x < 330;
  }

  private checkPhoto() {
    return {
      playerLooksLeft: this.player!.looksLeft,
      success:
        this.player!.object.y < this.dimensions.height - 115 &&
        this.player!.looksLeft,
      velocityY: this.player!.object.body.velocity.y,
    };
  }

  private createActions() {
    this.createAction("talk-to-prince", () => this.talkToPrince(), {
      precondition: () =>
        this.playerIsInPhotoPosition &&
        this.player!.looksAt(this.prince!.object),
      deactivateInputController: true,
      showActionHint: true,
    });
    this.createAction(
      "take-jump-photo",
      (action: Action) => this.takeJumpPhoto(action),
      {
        precondition: () =>
          this.playerIsInPhotoPosition &&
          !handlePlayerOutOfPhotoPositionAction.isActive,
        autoReset: true,
        executeBefore: () => {
          handlePlayerOutOfPhotoPositionAction.reset();
        },
      }
    );
    const handlePlayerOutOfPhotoPositionAction = this.createAction(
      "handle-player-out-of-photo-position",
      () => this.handlePlayerOutOfPhotoPosition(),
      {
        precondition: () =>
          !this.playerIsInPhotoPosition && !this.princeIsShooting,
      }
    );
  }

  private async createPhotoFrame() {
    const frameWidth = 8;
    this.photoFrame = this.add.graphics().setScrollFactor(0);
    this.photoFrame.fillStyle(0xffffff);
    this.photoFrame.fillRect(0, 0, this.renderer.width, frameWidth);
    this.photoFrame.fillRect(
      0,
      this.renderer.height - frameWidth,
      this.renderer.width,
      frameWidth
    );
    this.photoFrame.fillRect(0, 0, frameWidth, this.renderer.height);
    this.photoFrame.fillRect(
      this.renderer.width - frameWidth,
      0,
      frameWidth,
      this.renderer.height
    );
  }

  private async createWater(
    x: number,
    y: number,
    width: number,
    height: number,
    depth: number
  ) {
    const animationCount = 64;
    const rng = new phaser.Math.RandomDataGenerator(["The Sun is Burning"]);
    const { key, info } = this.getSpriteSheet("water-animations", "global");
    const maxX = x + width;
    const maxY = y + height;
    const sprites = Array.from({ length: animationCount }, () => {
      const sprite = this.add
        .sprite(0, 0, key)
        .setOrigin(0)
        .setDepth(depth)
        .setTint(colors.atacamaWaterReflection);
      createSpriteAnimations(sprite, key, info);
      return sprite;
    });
    const setRandomPosition = (sprite: Sprite) => {
      const positionX = rng.between(x, maxX);
      const positionY = rng.between(y, maxY);
      sprite
        .setPosition(positionX, positionY)
        .setScrollFactor(0.6 + (0.4 * (positionY - y)) / (maxY - y));
    };
    await Promise.all(
      sprites.map(async sprite => {
        setRandomPosition(sprite);
        const key = "animate-" + rng.between(1, 3);
        const frameCount = sprite.anims.get(key).getTotalFrames();
        const startFrame = rng.between(0, frameCount - 1);
        await playSpriteAnimation(sprite, { key, startFrame });
        do {
          if (rng.frac() < 1 / 4) {
            setRandomPosition(sprite);
          }
          await playSpriteAnimation(sprite, key);
        } while (this.scene.isActive());
      })
    );
  }

  private async flash(alpha: number) {
    this.flashTexture!.setVisible(true).setAlpha(alpha);
    await this.delay(100);
    this.flashTexture!.setVisible(false);
  }

  private async handlePlayerOutOfPhotoPosition() {
    this.jumpPhotoShootAborted = true;
    this.prince!.unsay();
    await this.prince!.putCameraAway();
    await this.delay(500);
    await this.prince!.say(
      this.getText("prince", "out-of-photo-position-comment")
    );
    await this.delay(1000);
  }

  private async shootPhoto() {
    this.prince!.shoot();
    this.flash(1 / 16);
    await this.delay(200, true);
    this.flash(0.25);
    await this.delay(50, true);
    this.getSound("camera-shutter")
      .setVolume(1 / 3)
      .play();
  }

  private async takeJumpPhoto(action: Action) {
    const checkAbortCondition = () => {
      if (this.jumpPhotoShootAborted) {
        this.jumpPhotoShootAborted = false;
        return true;
      }
      return false;
    };
    if (action.executionCount === 0) {
      await this.prince!.say(this.getText("prince", "jump-photo-request"));
      if (checkAbortCondition()) return;
      await this.delay(500);
      if (checkAbortCondition()) return;
    }
    if (!this.prince!.hasCamera) {
      await this.prince!.takeCamera();
      await this.delay(1000);
      if (checkAbortCondition()) return;
    }
    const countTexts = ["three", "two", "one"].map(key =>
      this.getText("prince", "countdown", key)
    );
    for (const text of countTexts) {
      await this.prince!.say(text);
      if (checkAbortCondition()) return;
      await this.delay(500);
      if (checkAbortCondition()) return;
    }
    this.princeIsShooting = true;
    await this.shootPhoto();
    const { playerLooksLeft, success, velocityY } = await this.checkPhoto();
    this.princeIsShooting = false;
    if (checkAbortCondition()) return;
    this.jumpPhotoAttemptCount++;
    if (success) {
      this.inputController!.deactivate(false);
      this.player!.freeze();
      this.flash(1);
      this.createPhotoFrame();
      await this.delay(4000);
      this.photoFrame!.destroy();
      this.photoFrame = undefined;
      this.player!.unfreeze();
      await this.player!.idle();
      await this.delay(500);
      await this.prince!.putCameraAway();
      await this.delay(500);
      await this.prince!.say(this.getText("prince", "perfect"));
      await this.delay(1000);
      this.nextState();
    } else {
      await this.delay(500);
      await this.prince!.putCameraAway();
      await this.delay(500);
      const textKey =
        this.jumpPhotoAttemptCount === 1
          ? "jump-on-zero"
          : !playerLooksLeft
          ? "look-into-camera"
          : velocityY < 0
          ? "too-late"
          : velocityY > 0
          ? "too-early"
          : "no-jump";
      await this.prince!.say(this.getText("prince", textKey));
      await this.delay(1000);
    }
  }

  private async talkToPrince() {
    const conversation = this.getText("prince", "small-talk");
    for (const [person, text] of conversation) {
      await this.delay(500);
      if (person === 1) {
        await this.player!.say(text);
      } else {
        await this.prince!.say(text);
      }
    }
    await this.delay(500);
    await this.prince!.takeCamera();
    await this.delay(1000);
    await this.shootPhoto();
    await this.delay(500);
    await this.prince!.putCameraAway();
    await this.delay(1000);
    this.nextState();
  }

  private async runEndTransition() {
    const toPosition = this.player!.getCenter()
      .subtract(this.cameras.main.worldView)
      .add({ x: 0, y: -3 });
    await new Promise<void>(resolve => {
      const options: RectTransitionOptions = {
        toPosition,
        callback: resolve,
        ease: easing.sine.out,
      };
      this.scene.launch(sceneKeys.rectTransition, options);
    });
    this.scene.stop(sceneKeys.rectTransition);
    this.nextState();
  }

  protected processImageObjects(imageObjects: ImageObject[]) {
    for (const { key, image, properties } of imageObjects) {
      const { x, y, width, height } = image;
      switch (key) {
        case "water":
          this.createWater(
            x,
            y,
            width - 10,
            height,
            (properties.get("depth") ?? 0) + 0.5
          );
          break;
      }
    }
  }

  protected processNoImageObjects(noImageObjects: NoImageObject[]) {
    for (const { key, x, y } of noImageObjects) {
      switch (key) {
        case "prince":
          this.prince = new AtacamaPrince(this, x, y);
          break;
      }
    }
  }

  protected processZoneObjects(zoneObjects: ZoneObject[]) {
    const groundZones = this.physics.add.staticGroup();
    this.physics.add.collider(this.player!.object, groundZones);
    for (const { key, zone } of zoneObjects) {
      switch (key) {
        case "ground-zone":
          groundZones.add(zone);
          break;
      }
    }
  }

  private nextState() {
    switch (this.state) {
      case State.Exploring:
        this.state = State.TakingJumpPhoto;
        break;
      case State.TakingJumpPhoto:
        this.state = State.EndTransition;
        this.runEndTransition();
        break;
      case State.EndTransition:
        this.complete(true);
        break;
    }
  }
}
