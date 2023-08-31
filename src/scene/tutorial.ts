import { Collider, Image, TiledProperties } from "../phaser";
import { ImageObject, Scene } from "./scene";
import { TimedInterpolator, easing, events } from "../helpers";

import { GamepadActionMapping } from "../input";
import { Options as SignOptions } from "./sign";
import phaser from "phaser";
import { registryKeys } from "../game";
import { sceneKeys } from "../config";

type ActionKey =
  | "player-get-scared"
  | "push-stone"
  | "put-boots-on"
  | "notice-phone"
  | "pick-up-phone";

type Sign = SignOptions & { isRead: boolean; textIndex: number };

const enum State {
  Initial,
  Explore,
  PushingStone,
  PuttingBootsOn,
  PickingUpPhone,
}

export class TutorialScene extends Scene<void, ActionKey> {
  private state = State.Initial;

  private dimensions = { width: 928, height: 256 };

  private hidingStone?: Image;

  private phone?: Image;

  private rainBoots?: Image;

  private signs?: phaser.Physics.Arcade.Group;

  private signCollider?: Collider;

  private activeSign?: Sign;

  constructor() {
    super("tutorial");
  }

  public create() {
    super.create();

    this.setBounds(this.dimensions.width, this.dimensions.height);

    this.paintSky("forest", 16);

    this.addPlayer(32, this.dimensions.height - 48, false);
    this.player!.putOnBackpack();
    this.player!.startCameraFollow();

    this.signs = this.physics.add.group({
      allowGravity: false,
      immovable: true,
    });

    const layers = this.processTileMap("tutorial", "forest");

    layers.get("Platforms")!.forEachTile(tile => {
      tile.setCollision(false, false, true, false, false);
    });

    this.physics.add.collider(this.player!.object, layers.get("Ground")!);
    this.physics.add.collider(this.player!.object, layers.get("Platforms")!);

    this.signCollider = this.physics.add.overlap(
      this.player!.object,
      this.signs,
      (_, signImage) => {
        const sign: Sign = (signImage as Image).getData("sign");
        if (!sign.isRead) {
          this.player!.unsay();
          this.inputController!.deactivate(false);
          this.player!.idle();
          this.activeSign = sign;
          this.scene.launch(sceneKeys.sign, sign);
          this.scene.moveBelow(sceneKeys.sign);
          sign.isRead = true;
        }
      }
    );

    this.scene
      .get(sceneKeys.sign)
      .events.on(events.scene.shutdown, async () => {
        const signIndex = this.activeSign!.textIndex;
        this.handleSignWasRead(signIndex);
        this.activeSign = undefined;
        await this.controls!.right.released();
        this.inputController!.activate();
        if (signIndex === 2) {
          this.nextState();
        }
      });

    this.createActions();
    this.playerWalkIn();
  }

  private async playerWalkIn() {
    this.inputController!.deactivate(false);
    const zoneColliders = this.physics.add.staticGroup();
    const zone = this.add
      .zone(-32, this.dimensions.height - 16, 64, 16)
      .setOrigin(0);
    zoneColliders.add(zone);
    const collider = this.physics.add.collider(
      this.player!.object,
      zoneColliders
    );
    const playerObject = this.player!.object;
    const playerPositionX = playerObject.x;
    playerObject.setCollideWorldBounds(false).setX(-16);
    await this.delay(2000);
    await this.player!.walkTo(playerPositionX);
    playerObject.setCollideWorldBounds(true);
    collider.destroy();
    zoneColliders.destroy();
    zone.destroy();
    this.inputController!.activate();
    this.nextState();
  }

  public update(time: number, delta: number) {
    if (this.isComplete) {
      return;
    }
    super.update(time, delta);
    switch (this.state) {
      case State.Explore:
        this.processActions("player-get-scared");
        break;
      case State.PushingStone:
        this.processActions("push-stone");
        break;
      case State.PuttingBootsOn:
        this.processActions("put-boots-on");
        break;
      case State.PickingUpPhone:
        this.processActions("notice-phone", "pick-up-phone");
        break;
    }
  }

  private createActions() {
    this.createAction("push-stone", () => this.pushStone(), {
      precondition: () => {
        return this.player!.isInRangeTo(this.hidingStone!, 16);
      },
      deactivateInputController: true,
      showActionHint: true,
    });
    this.createAction("put-boots-on", () => this.putOnBoots(), {
      precondition: () => this.player!.isInRangeTo(this.rainBoots!, 16),
      deactivateInputController: true,
      showActionHint: true,
    });
    const noticePhone = this.createAction(
      "notice-phone",
      () => this.noticeSmartphone(),
      {
        precondition: () => this.phoneIsInSight,
      }
    );
    this.createAction("pick-up-phone", () => this.pickUpPhone(), {
      precondition: () =>
        noticePhone.isComplete &&
        this.player!.isInRangeTo(this.phone!, 16) &&
        this.player!.object.getBottomCenter().y! <
          this.phone!.getBottomCenter().y! + 1,
      deactivateInputController: true,
      showActionHint: true,
      showLock: false,
    });
    this.createAction(
      "player-get-scared",
      () => this.player!.say(this.getText("player", "is-scared")),
      {
        precondition: () => this.player!.getCenter().x > 128,
      }
    );
  }

  private getControlTexts(): {
    action: string;
    directional: string;
    jump: string;
  } {
    if (this.hasConnectedGamepads) {
      const gamepadActionMapping = this.registry.get(
        registryKeys.gamepadActionMapping
      ) as GamepadActionMapping;
      const texts = this.getGlobalText("controller", "gamepad");
      return {
        action: texts[gamepadActionMapping.action.key],
        directional: texts.dpad,
        jump: texts[gamepadActionMapping.jump.key],
      };
    } else {
      const texts = this.getGlobalText("controller", "keyboard");
      return {
        action: "A",
        directional: texts.arrows,
        jump: texts.space,
      };
    }
  }

  private async handleSignWasRead(signIndex: number) {
    switch (signIndex) {
      case 1:
        await this.delay(1500);
        await this.player!.say(this.getText("player", "safety-first"));
        break;
      case 2:
        await this.delay(1500);
        await this.player!.say(this.getText("player", "lets-turn-around"));
        break;
    }
  }

  private async noticeSmartphone() {
    for (const text of this.getText("player", "noticed-smartphone")) {
      await this.player!.say(text);
      await this.delay(500);
    }
  }

  private get phoneIsInSight() {
    const phoneToPlayerDifference = this.player!.getCenter().subtract(
      this.phone!.getCenter()
    );
    return (
      Math.abs(phoneToPlayerDifference.x) < 64 &&
      Math.abs(phoneToPlayerDifference.y) < 32
    );
  }

  private async pickUpPhone() {
    await this.player!.walkToReach(this.phone!);
    await this.player!.take("phone", () => {
      this.phone!.destroy();
    });
    await this.delay(1000);
    await this.notify(this.getText("navigator-taken"));
    await this.delay(500);
    this.complete();
  }

  private async putOnBoots() {
    await this.player!.walkToReach(this.rainBoots!);
    await this.player!.take("rain-boots", () => {
      this.rainBoots!.destroy();
      this.player!.putOnBoots();
    });
    this.inputController!.activate();
    await this.delay(500);
    this.player!.say(this.getText("player", "putting-on-boots"));
    this.nextState();
  }

  private async pushStone() {
    await this.player!.idle();
    await this.player!.walkTo(this.hidingStone!.getCenter().x! + 7);
    this.player!.lookLeft();
    await this.delay(500);
    await new Promise<void>(resolve => this.player!.do(resolve));
    const startX = this.hidingStone!.x;
    const interpolator = new TimedInterpolator(750, easing.sine.out);
    interpolator.update(this.time.now);
    while (!interpolator.isComplete) {
      await this.nextWorldStep();
      const ratio = interpolator.update(this.time.now);
      this.hidingStone!.setX(startX - 8 * ratio);
    }
    await this.player!.say(this.getText("player", "found-boots"));
    this.inputController!.activate();
    await this.delay(1000);
    this.nextState();
  }

  private setupSign(image: Image, properties: TiledProperties) {
    const textIndex = properties.get("text-index");
    const text: SignOptions = this.getText("signs")[textIndex];
    const controlTexts = this.getControlTexts();
    for (const page of text.pages) {
      for (let [index, line] of page.entries()) {
        for (const [key, text] of Object.entries(controlTexts)) {
          line = line.replaceAll(`{${key}}`, text);
        }
        page[index] = line;
      }
    }
    const sign: Sign = {
      isRead: false,
      textIndex,
      ...text,
    };
    image.setData("sign", sign);
    this.signs!.add(image);
  }

  protected processImageObjects(imageObjects: ImageObject[]) {
    for (const { name, key, image, properties } of imageObjects) {
      switch (name) {
        case "Hiding Stone":
          this.hidingStone = image;
          continue;
      }
      switch (key) {
        case "phone":
          this.phone = image;
          break;
        case "rain-boots":
          this.rainBoots = image;
          break;
        case "wood-sign":
          this.setupSign(image, properties);
          break;
      }
    }
  }

  private nextState() {
    switch (this.state) {
      case State.Initial:
        this.state = State.Explore;
        break;
      case State.Explore:
        this.signCollider!.destroy();
        this.state = State.PushingStone;
        break;
      case State.PushingStone:
        this.state = State.PuttingBootsOn;
        break;
      case State.PuttingBootsOn:
        this.state = State.PickingUpPhone;
        break;
      case State.PickingUpPhone:
        this.complete();
        break;
    }
  }
}
