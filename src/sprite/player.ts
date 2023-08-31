import { ATLAS_KEY, colors } from "../config";
import {
  GetBounds,
  Scene,
  SoundConfig,
  SpriteWithDynamicBody,
} from "../phaser";
import { MultilineText, uppercase } from "../text";
import {
  createSpriteAnimations,
  delay,
  events,
  getImageKey,
  getSound,
  getSpriteSheet,
  playRandomStepSound,
  playSpriteAnimation,
} from "../helpers";

import { ActionHint } from "./action-hint";
import { Person } from "./person";
import { Vector } from "../phaser";
import phaser from "phaser";

const JUMP_SPEED_WITH_BOOTS = 160;

const JUMP_SPEED_WITHOUT_BOOTS = 96;

export const PLAYER_DEPTH = 1;

const soundConfigs = {
  temp: { volume: 0 },
  walk: { volume: 3 / 16 },
};

const enum State {
  Idle,
  Jump,
  Walk,
  Wink,
}

const enum AnimationGroup {
  Backpack,
  BackpackAndBoots,
  Boots,
}

export class Player extends Person<SpriteWithDynamicBody> {
  private actionHintOffset = new Vector(-5, -4);

  private animationGroup: AnimationGroup;

  private jumpSpeed: number;

  private walkSpeed = 48;

  private actionHint?: ActionHint;

  private disappearingActionHints: Set<ActionHint> = new Set();

  private jumpSound;

  private lastVelocityY = 0;

  private maxVelocityY = 256;

  public mute = false;

  private takeSound;

  private state;

  private walkSoundIdentifier: Symbol | null = null;

  constructor(scene: Scene, x: number, y: number, withBoots: boolean) {
    const spriteSheetDefs: [string, AnimationGroup][] = [
      ["player-backpack", AnimationGroup.Backpack],
      ["player-backpack-boots", AnimationGroup.BackpackAndBoots],
      ["player-boots", AnimationGroup.Boots],
    ];
    const spriteSheets = spriteSheetDefs.map(([name, animationGroup]) => {
      const { key, info } = getSpriteSheet(scene.registry, "global", name);
      return { animationGroup, key, info };
    });
    super(
      scene.physics.add
        .sprite(x, y, spriteSheets[0]!.key)
        .setOrigin(0)
        .setSize(6, 24)
        .setOffset(8, 8)
        .setCollideWorldBounds(true)
        .setDepth(PLAYER_DEPTH)
    );
    if (withBoots) {
      this.animationGroup = AnimationGroup.Boots;
      this.jumpSpeed = JUMP_SPEED_WITH_BOOTS;
    } else {
      this.animationGroup = AnimationGroup.Backpack;
      this.jumpSpeed = JUMP_SPEED_WITHOUT_BOOTS;
    }
    this.setMaxCharsPerLine(24);
    for (const { animationGroup, key, info } of spriteSheets) {
      const suffix = Player.createAnimationKeySuffix(animationGroup);
      createSpriteAnimations(this.object, key, info, suffix);
    }
    for (const key of ["idle", "walk"]) {
      for (const animationGroup of [
        AnimationGroup.Backpack,
        AnimationGroup.BackpackAndBoots,
        AnimationGroup.Boots,
      ]) {
        this.object.anims.get(
          Player.createAnimationKey(key, animationGroup)
        ).repeat = -1;
      }
    }
    this.object.anims.play(this.getAnimationKey("idle"), true);
    this.state = State.Idle;
    this.jumpSound = getSound(scene, "jump", { volume: 1 / 8 });
    this.takeSound = getSound(scene, "take", { volume: 1 / 6 });
    scene.events.on(events.scene.postUpdate, () => {
      this.updateActionHintPosition();
      this.balloon?.update();
    });
  }

  public get looksLeft() {
    return this.object.flipX;
  }

  public get looksRight() {
    return !this.object.flipX;
  }

  public looksAt(objectX: number | GetBounds) {
    if (typeof objectX === "object") {
      objectX = objectX.getCenter().x!;
    }
    const playerX = this.getCenter().x!;
    return (
      (playerX < objectX - 4.5 && this.looksRight) ||
      (playerX > objectX + 4.5 && this.looksLeft)
    );
  }

  public async activateActionHint() {
    if (this.actionHint !== undefined) {
      const actionHint = this.actionHint!;
      this.disappearingActionHints.add(actionHint);
      this.actionHint = undefined;
      await actionHint.activate();
      this.disappearingActionHints.delete(actionHint);
    }
  }

  public async cancelActionHint() {
    if (this.actionHint !== undefined) {
      const actionHint = this.actionHint;
      this.disappearingActionHints.add(actionHint);
      this.actionHint = undefined;
      await actionHint.cancel();
      this.disappearingActionHints.delete(actionHint);
    }
  }

  public showActionHint() {
    if (this.actionHint === undefined) {
      this.actionHint = new ActionHint(this.object.scene);
      this.actionHint.object.setDepth(PLAYER_DEPTH);
      this.updateActionHintPosition();
      this.updateBalloonOffset();
    }
  }

  public async take(name: string, readyToTakeCallback?: () => void) {
    await this.do(readyToTakeCallback);
    const margin = 2;
    const scene = this.object.scene;
    const rt = scene.add
      .renderTexture(scene.renderer.width - 16 - margin, margin, 16, 16)
      .setOrigin(0)
      .setScrollFactor(0)
      .drawFrame(ATLAS_KEY, getImageKey("icons", "background"))
      .drawFrame(ATLAS_KEY, getImageKey("icons", name));
    if (!this.mute) {
      this.takeSound.play();
    }
    for (let i = 0; i < 4; i++) {
      await delay(scene, 100);
      rt.setVisible(i % 2 === 1);
    }
    await delay(scene, 4000);
    rt.destroy();
  }

  public async do(readyToUseCallback?: () => void) {
    await playSpriteAnimation(
      this.object,
      Player.createAnimationKey("do", this.animationGroup)
    );
    await delay(this.object.scene, 100);
    if (readyToUseCallback !== undefined) {
      await readyToUseCallback();
    }
    await playSpriteAnimation(
      this.object,
      Player.createAnimationKey("do", this.animationGroup),
      false,
      true
    );
    this.idle();
  }

  public freeze() {
    this.object
      .setAcceleration(0, 0)
      .setVelocity(0, 0)
      .body.setAllowGravity(false);
  }

  public unfreeze() {
    this.object.body.setAllowGravity(true);
  }

  public async idle(startFrame?: number) {
    this.object.setVelocityX(0);
    if (!this.isOnFloor()) {
      await this.onFloor();
      if (this.object.body.velocity.x !== 0) {
        return;
      }
    }
    this.object.anims.play(
      { key: this.getAnimationKey("idle"), startFrame },
      startFrame === undefined
    );
    this.state = State.Idle;
  }

  public isInRangeTo(object: GetBounds | Vector, distance: number) {
    const position = object instanceof Vector ? object : object.getCenter();
    return this.getCenter().distanceSq(position) <= distance * distance;
  }

  public jump() {
    if (this.isOnFloor()) {
      if (!this.mute) {
        this.jumpSound.play();
      }
      this.object.setVelocityY(-this.jumpSpeed);
      if (this.animationGroup === AnimationGroup.Backpack) {
        this.object.anims.play(this.getAnimationKey("idle"));
        this.object.anims.pause();
      } else {
        this.object.anims.play(this.getAnimationKey("jump"), true);
      }
      this.state = State.Jump;
    }
  }

  public lookLeft() {
    if (this.state === State.Idle) {
      this.object.setFlipX(true);
    }
  }

  public lookRight() {
    if (this.state === State.Idle) {
      this.object.setFlipX(false);
    }
  }

  private static createAnimationKeySuffix(group: AnimationGroup) {
    return "-" + group;
  }

  private static createAnimationKey(key: string, group: AnimationGroup) {
    return key + Player.createAnimationKeySuffix(group);
  }

  private getAnimationKey(key: string) {
    return Player.createAnimationKey(key, this.animationGroup);
  }

  private playRandomStepSound(config: SoundConfig) {
    playRandomStepSound(this.object.scene, config);
  }

  private updateBalloonOffset() {
    if (
      this.actionHint === undefined &&
      this.disappearingActionHints.size === 0
    ) {
      this.setBalloonOffset(new Vector(0, 2));
    } else {
      this.setBalloonOffset(new Vector(0, -6));
    }
  }

  public update() {
    if (this.object.body.velocity.x !== 0) {
      this.object.setFlipX(this.object.body.velocity.x < 0);
    }
    if (this.object.body.velocity.y > this.maxVelocityY) {
      this.object.setVelocityY(this.maxVelocityY);
    }
    if (this.isOnFloor()) {
      const volume = (this.lastVelocityY - 16) / 384;
      if (volume > 0.1) {
        soundConfigs.temp.volume = Math.min(volume, 0.5);
        if (!this.mute) {
          this.playRandomStepSound(soundConfigs.temp);
        }
      }
    } else {
      if (
        this.object.body.velocity.y > 128 &&
        this.object.anims.currentAnim?.key !== this.getAnimationKey("jump")
      ) {
        this.object.anims.play(this.getAnimationKey("jump"));
      }
    }
    this.lastVelocityY = this.object.body.velocity.y;
  }

  private updateActionHintPosition() {
    const position = (this.object.getTopCenter() as Vector).add(
      this.actionHintOffset
    );
    this.actionHint?.object.setPosition(position.x, position.y);
    for (const actionHint of this.disappearingActionHints) {
      actionHint.object.setPosition(position.x, position.y);
    }
  }

  private isOnFloor() {
    return this.object.body.onFloor();
  }

  public async onFloor() {
    const update = () => {
      if (this.isOnFloor()) {
        this.object.scene.physics.world.off(events.world.step, update);
        resolvePromise();
      }
    };
    this.object.scene.physics.world.on(events.world.step, update);
    let resolvePromise: () => void;
    return new Promise<void>(resolve => {
      resolvePromise = resolve;
    });
  }

  public async playWalkSounds() {
    if (this.walkSoundIdentifier !== null) {
      return;
    }
    this.walkSoundIdentifier = Symbol();
    const identifier = this.walkSoundIdentifier;
    await delay(this.object.scene, 200, true);
    while (
      this.state === State.Walk &&
      identifier === this.walkSoundIdentifier
    ) {
      this.playRandomStepSound(soundConfigs.walk);
      await delay(this.object.scene, 400, true);
    }
    if (this.state !== State.Walk) {
      this.walkSoundIdentifier = null;
    }
  }

  public async putOnBackpack() {
    if (this.animationGroup === AnimationGroup.Boots) {
      this.animationGroup = AnimationGroup.BackpackAndBoots;
      await this.idle();
      return true;
    }
    return false;
  }

  public async putOnBoots() {
    if (this.animationGroup === AnimationGroup.Backpack) {
      this.animationGroup = AnimationGroup.BackpackAndBoots;
      await this.idle();
      this.jumpSpeed = JUMP_SPEED_WITH_BOOTS;
    }
  }

  private resetBalloonColors() {
    this.setBalloonColors({});
  }

  public async say(text: MultilineText) {
    await this.speak(text);
  }

  public async shout(text: MultilineText) {
    this.setBalloonColors({ text: colors.red });
    const promise = this.speak(uppercase(text));
    this.resetBalloonColors();
    await promise;
  }

  private async speak(text: MultilineText) {
    const promise = super.say(text);
    this.balloon!.setDepth(PLAYER_DEPTH + 1);
    this.updateBalloonOffset();
    await promise;
  }

  public startCameraFollow() {
    const { width } = this.object.scene.renderer;
    this.object.scene.cameras.main
      .startFollow(
        this.object,
        false,
        undefined,
        undefined,
        -this.object.width / 2,
        -this.object.height / 2
      )
      .setDeadzone(width / 8, 0);
  }

  public stopCameraFollow() {
    this.object.scene.cameras.main.stopFollow();
  }

  public async takeOffBackpack() {
    if (this.animationGroup === AnimationGroup.BackpackAndBoots) {
      this.animationGroup = AnimationGroup.Boots;
      await this.idle();
      return true;
    }
    return false;
  }

  public async think(text: MultilineText) {
    this.setBalloonColors({ text: colors.gray });
    const promise = this.speak(text);
    this.resetBalloonColors();
    await promise;
  }

  private walk(direction: number) {
    if ((direction === 1) === this.object.flipX) {
      this.walkSoundIdentifier = null;
    }
    this.object
      .setFlipX(direction === -1)
      .setVelocityX(direction * this.walkSpeed);
    if (this.isOnFloor()) {
      this.object.anims.play(this.getAnimationKey("walk"), true);
      this.state = State.Walk;
      if (!this.mute) {
        this.playWalkSounds();
      }
    }
  }

  public walkLeft() {
    this.walk(-1);
  }

  public walkRight() {
    this.walk(1);
  }

  public async walkTo(targetPositionX: number, exact = false) {
    const currentPositionX = this.getCenter().x!;
    if (phaser.Math.Fuzzy.Equal(targetPositionX, currentPositionX)) {
      this.idle();
      this.object.setX(targetPositionX - this.object.width / 2);
      return;
    }
    let direction: "left" | "right";
    if (targetPositionX < currentPositionX) {
      this.walkLeft();
      direction = "left";
    } else {
      this.walkRight();
      direction = "right";
    }
    const update = async () => {
      const currentPositionX = this.getCenter().x;
      if (
        direction === "left" &&
        phaser.Math.Fuzzy.LessThan(targetPositionX, currentPositionX)
      ) {
        this.walkLeft();
      } else if (
        direction === "right" &&
        phaser.Math.Fuzzy.GreaterThan(targetPositionX, currentPositionX)
      ) {
        this.walkRight();
      } else {
        this.object.scene.physics.world.off(events.world.step, update);
        await this.idle();
        this.object.setX(targetPositionX - this.object.width / 2);
        if (exact) {
          // set final position only after next world step,
          // because the players position might still change,
          // maybe due to phasers's integration algorithm
          this.object.scene.physics.world.once(events.world.step, () => {
            this.object.setX(targetPositionX - this.object.width / 2);
            resolvePromise();
          });
        } else {
          resolvePromise();
        }
      }
    };
    this.object.scene.physics.world.on(events.world.step, update);
    let resolvePromise: () => void;
    return new Promise<void>(resolve => {
      resolvePromise = resolve;
    });
  }

  public async walkToReach(objectX: number | GetBounds) {
    if (typeof objectX === "object") {
      objectX = objectX.getCenter().x!;
    }
    const playerX = this.getCenter().x;
    if (
      playerX < objectX - 6 ||
      (playerX > objectX - 4 && playerX <= objectX)
    ) {
      await this.walkTo(objectX - 5);
      this.lookRight();
    } else if (
      playerX > objectX + 6 ||
      (playerX < objectX + 4 && playerX > objectX)
    ) {
      await this.walkTo(objectX + 5);
      this.lookLeft();
    } else if (playerX > objectX) {
      this.lookLeft();
    } else {
      this.lookRight();
    }
  }

  public wink() {
    this.object.anims.play(this.getAnimationKey("wink"));
    this.state = State.Wink;
  }
}
