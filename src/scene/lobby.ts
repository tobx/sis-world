import { ATLAS_KEY, colors, fonts, sceneKeys } from "../config";
import { Collider, Image } from "../phaser";
import { Elevator, Button as ElevatorButton } from "../sprite/elevator";
import { ImageObject, NoImageObject, Scene, ZoneObject } from "./scene";
import { easing, getDimensionVector } from "../helpers";

import { BarrierGate } from "../sprite/barrier-gate";
import { Control } from "../controls";
import { MultilineText } from "../text";
import { PLAYER_DEPTH } from "../sprite/player";
import { Receptionists } from "../sprite/receptionists";
import { Options as RectTransitionOptions } from "./rect-transition";
import { Vector } from "../phaser";
import { WaterDispenser } from "../sprite/water-dispenser";

type ActionKey =
  | "alarm"
  | "comment-on-water-dispenser-stack"
  | "enter-right-elevator"
  | "fill-plastic-cup"
  | "press-elevator-button"
  | "show-ceo-picture-sign"
  | "show-painting-sign"
  | "talk-to-receptionists"
  | "take-candy"
  | "use-barrier-gate"
  | "use-water-dispenser";

const enum State {
  Inital,
  BarrierGateIsWrecked,
  UsingElevator,
}

export class LobbyScene extends Scene<void, ActionKey> {
  private state = State.Inital;

  private barrierGate?: BarrierGate;

  private barrierGateCommentIndex = 0;

  private candies?: Image;

  private ceoPicture?: Image;

  private dimensions = { width: 960, height: 128 };

  private elevatorButton?: ElevatorButton;

  private elevatorLeft?: Elevator;

  private elevatorRight?: Elevator;

  private elevatorZoneCollider?: Collider;

  private painting?: Image;

  private pictureSign?: Image;

  private plasticCup = {
    isInPossessionOfPlayer: false,
    isFull: false,
  };

  private playerAskedForWater = false;

  private playerNeedsBadge = false;

  private playerNeedsPlasticCup = false;

  private playerNeedsWater = false;

  private gettingAttentionIndex = 0;

  private receptionists?: Receptionists;

  private waterDispenser?: WaterDispenser;

  private waterDispenserStack?: Image;

  private frames?: Image;

  private reflections?: Image;

  constructor() {
    super("lobby");
  }

  public create() {
    super.create();
    this.setBounds(this.dimensions.width, this.dimensions.height);

    this.paintSky("light");

    this.addPlayer(this.dimensions.width - 48, this.dimensions.height - 48);
    this.player!.putOnBackpack();
    this.player!.lookLeft();
    this.player!.startCameraFollow();

    const layers = this.processTileMap("lobby", "lobby", [
      "barrier-gate",
      "elevator-button",
      "elevator-closed",
      "elevator-open",
      "receptionists",
      "water-dispenser",
    ]);

    this.pictureSign = this.add
      .image(8, 8, ATLAS_KEY, this.getImageKey("picture-sign"))
      .setOrigin(0)
      .setDepth(PLAYER_DEPTH + 1)
      .setScrollFactor(0)
      .setVisible(false);

    this.physics.add.collider(this.player!.object, layers.get("Ground")!);
    this.physics.add.collider(this.player!.object, this.barrierGate!.object);

    this.createActions();

    if (this.frames !== undefined && this.reflections !== undefined) {
      const mask = this.make
        .graphics(undefined, false)
        .fillRect(
          this.frames.x,
          this.frames.y,
          this.frames.width,
          this.frames.height
        )
        .setScrollFactor(this.frames.scrollFactorX, this.frames.scrollFactorY)
        .createGeometryMask();
      this.add
        .container(0, 0)
        .setDepth(this.reflections.depth)
        .add(this.reflections)
        .setMask(mask);
    }
  }

  public update(time: number, delta: number) {
    if (this.isComplete) {
      return;
    }
    super.update(time, delta);
    switch (this.state) {
      case State.Inital:
        this.processActions(
          "alarm",
          "comment-on-water-dispenser-stack",
          "fill-plastic-cup",
          "talk-to-receptionists",
          "take-candy",
          "use-water-dispenser",
          "use-barrier-gate"
        );
        break;
      case State.BarrierGateIsWrecked:
        this.processActions(
          // keep this on top of the list
          "enter-right-elevator",

          "press-elevator-button",
          "show-ceo-picture-sign",
          "show-painting-sign"
        );
        break;
    }
  }

  private createActions() {
    const alarm = this.createAction("alarm", () => this.alarm(), {
      precondition: () =>
        this.barrierGate!.isActive &&
        this.player!.getCenter().subtract(this.barrierGate!.object).x < 9,
      autoReset: true,
      deactivateInputController: true,
    });
    this.createAction("enter-right-elevator", () => this.enterRightElevator(), {
      precondition: () =>
        this.elevatorRight!.isOpen &&
        this.player!.isInRangeTo(this.elevatorRight!.object, 8),
      deactivateInputController: true,
      executeBefore: () => this.nextState(),
      showActionHint: true,
    });
    this.createAction(
      "comment-on-water-dispenser-stack",
      () => this.player!.say(this.getText("water-dispenser-stack", "comment")),
      {
        precondition: () =>
          this.waterDispenserStack!.visible &&
          this.player!.isInRangeTo(this.waterDispenserStack!, 56),
      }
    );
    this.createAction("fill-plastic-cup", () => this.fillPlasticCup(), {
      precondition: () => {
        const waterDispenserX = this.waterDispenserStack!.getCenter().x!;
        return (
          this.waterDispenserStack!.visible &&
          !this.plasticCup.isFull &&
          this.player!.object.x > waterDispenserX - 24 &&
          this.player!.object.x < waterDispenserX + 12
        );
      },
      deactivateInputController: true,
      resetCondition: () => !this.plasticCup.isFull,
      showActionHint: true,
    });
    this.createAction(
      "press-elevator-button",
      () => this.pressElevatorButton(),
      {
        precondition: () =>
          this.player!.isInRangeTo(this.elevatorButton!.object, 16),
        autoReset: true,
        deactivateInputController: true,
        reactivateInputController: false,
        showActionHint: true,
      }
    );
    this.createAction(
      "show-ceo-picture-sign",
      () => this.showCeoPictureSign(),
      {
        precondition: () =>
          this.player!.isInRangeTo(
            this.getPictureSignPosition(this.ceoPicture!),
            8
          ),
        autoReset: true,
        deactivateInputController: true,
        showActionHint: true,
        showLock: false,
      }
    );
    this.createAction("show-painting-sign", () => this.showPaintingSign(), {
      precondition: () =>
        this.player!.isInRangeTo(
          this.getPictureSignPosition(this.painting!),
          8
        ),
      autoReset: true,
      deactivateInputController: true,
      showActionHint: true,
      showLock: false,
    });
    this.createAction("take-candy", () => this.takeCandy(), {
      precondition: () =>
        this.playerAskedForWater && this.player!.isInRangeTo(this.candies!, 16),
      deactivateInputController: true,
      showActionHint: true,
    });
    this.createAction(
      "talk-to-receptionists",
      () => this.talkToReceptionists(),
      {
        precondition: () =>
          this.player!.isInRangeTo(this.receptionists!.object, 32),
        resetCondition: () =>
          !this.playerAskedForWater || this.waterDispenserStack!.visible,
        showActionHint: true,
      }
    );
    this.createAction("use-water-dispenser", () => this.useWaterDispenser(), {
      precondition: () =>
        !alarm.isActive &&
        this.player!.isInRangeTo(this.waterDispenser!.object, 16),
      deactivateInputController: true,
      resetCondition: () => !this.plasticCup.isInPossessionOfPlayer,
      showActionHint: true,
    });
    this.createAction("use-barrier-gate", () => this.useBarrierGate(), {
      precondition: () =>
        this.player!.isInRangeTo(this.barrierGate!.object, 18),
      autoReset: true,
      deactivateInputController: true,
      showActionHint: true,
    });
  }

  private async alarm() {
    this.barrierGate!.alarm();
    this.receptionists!.stopTalking();
    await this.delay(1500);
    await this.player!.walkTo(
      this.receptionists!.object.getLeftCenter().x! - 20
    );
    await this.delay(500);
    this.receptionists!.look();
    await this.delay(1000);
    this.barrierGate!.idle();
    await this.delay(500);
    this.receptionists!.speechType = "aggressive";
    await this.receptionists!.say(this.getText("receptionists", "nice-try"), 1);
    await this.delay(1500);
    this.receptionists!.talk();
  }

  private async askForWater() {
    this.inputController!.deactivate();
    await this.player!.walkTo(this.receptionists!.object.getCenter().x! + 24);
    this.player!.lookLeft();
    await this.delay(1000);
    await this.player!.say(
      this.getText("receptionists", "getting-attention-again")
    );
    await this.delay(1000);
    this.receptionists!.look();
    await this.delay(1000);
    this.receptionists!.speechType = "aggressive";
    for (const [person, text] of this.getText(
      "receptionists",
      "ask-for-water"
    )) {
      await this.delay(500);
      if (person === 1) {
        await this.player!.say(text);
      } else {
        await this.receptionists!.say(text, 1);
      }
    }
    this.playerAskedForWater = true;
    this.receptionists!.stopTalking();
    this.inputController!.activate();
    this.receptionists!.resetTalk();
  }

  private async enterRightElevator() {
    this.elevatorZoneCollider!.active = true;
    await this.player!.walkTo(this.elevatorRight!.object.getCenter().x! + 1);
    this.elevatorRight!.object.setDepth(PLAYER_DEPTH + 1);
    this.elevatorRight!.display.setDepth(PLAYER_DEPTH + 1);
    await this.elevatorRight!.close();
    this.cameras.main.stopFollow();
    await this.scrollCamera(new Vector(106, 20), 1000, easing.quad.inOut);
    const toPosition = this.getLocalCoordinates(this.elevatorRight!.object);
    const toDimensions = getDimensionVector(this.elevatorRight!.object).add(
      new Vector(-1, 0)
    );
    await Promise.all([
      new Promise<void>(resolve => {
        const options: RectTransitionOptions = {
          toPosition,
          toDimensions,
          ease: easing.sine.out,
          callback: resolve,
        };
        this.scene.launch(sceneKeys.rectTransition, options);
      }),
      this.elevatorRight?.goToFloor(5, 500),
    ]);
    this.nextState();
  }

  private async fillPlasticCup() {
    if (this.plasticCup.isInPossessionOfPlayer) {
      await this.player!.idle();
      await this.player!.walkToReach(
        this.waterDispenserStack!.getCenter().x! + 4
      );
      await this.player!.take("plastic-cup-full");
      this.plasticCup.isFull = true;
      await this.delay(500);
      await this.player!.say(
        this.getText("water-dispenser-stack", "cup-filled")
      );
      this.inputController!.activate();
    } else {
      await this.player!.say(
        this.getText("water-dispenser-stack", "cup-required")
      );
      this.inputController!.activate();
      this.playerNeedsPlasticCup = true;
      await this.delay(1000);
    }
  }

  private getPictureSignPosition(picture: Image) {
    return (picture.getBottomRight() as Vector).add(new Vector(-5, 0));
  }

  private async useWaterDispenser() {
    await this.player!.walkToReach(this.waterDispenser!.object);
    if (this.playerNeedsPlasticCup) {
      await this.player!.take("plastic-cup-empty", () => {
        this.waterDispenser!.removePlasticCup();
        this.plasticCup.isInPossessionOfPlayer = true;
      });
    } else {
      await this.delay(500);
      this.inputController!.activate();
      await this.player!.say(this.getText("water-dispenser", "empty"));
      await this.delay(1000);
      this.playerNeedsWater = true;
    }
  }

  private async pressElevatorButton() {
    await this.player!.walkToReach(this.elevatorButton!.object);
    await this.player!.do(() => this.elevatorButton!.press());
    if (this.elevatorButton!.pressCount === 1) {
      await this.handleFirstElevatorButtonPress();
    } else {
      this.inputController!.activate();
      await this.handleFurtherElevatorButtonPresses();
    }
    this.elevatorButton!.reset();
  }

  private async handleFirstElevatorButtonPress() {
    await this.elevatorLeft!.goToFloor(1);
    await this.elevatorRight!.goToFloor(2);
    await this.delay(3000);
    await this.elevatorRight!.goToFloor(1);
    await this.elevatorLeft!.goToFloor(-1);
    await this.delay(3000);
    await this.elevatorLeft!.goToFloor(0);
    await this.delay(500);
    await this.elevatorLeft!.open();
    this.inputController!.activate();
    await this.delay(1500);
    await this.say(
      this.elevatorLeft!.object,
      this.getText("elevator", "hrumph"),
      {
        offsetX: -7,
        offsetY: 9,
      }
    );
    await this.delay(1500);
    await this.say(
      this.elevatorLeft!.object,
      this.getText("elevator", "cough"),
      {
        offsetX: 6,
        offsetY: 14,
      }
    );
    await this.delay(1500);
    await this.say(
      this.elevatorLeft!.object,
      this.getText("elevator", "greeting"),
      {
        offsetX: -1,
        offsetY: 13,
      }
    );
    await this.elevatorLeft!.close();
    this.elevatorLeft!.goToFloor(5);
  }

  private async handleFurtherElevatorButtonPresses() {
    await this.elevatorRight!.goToFloor(0);
    await this.delay(500);
    await this.elevatorRight!.open();
    await this.delay(1500);
    if (this.state !== State.UsingElevator) {
      await this.elevatorRight!.close();
    }
  }

  private async talkToReceptionists() {
    this.receptionists!.stopTalking();
    if (this.playerNeedsBadge) {
      const gettingAttentionText = this.getText(
        "receptionists",
        "getting-attention"
      );
      if (this.gettingAttentionIndex < gettingAttentionText.length) {
        await this.getAttention(gettingAttentionText);
        this.gettingAttentionIndex++;
      } else if (this.playerNeedsWater && !this.playerAskedForWater) {
        await this.askForWater();
      } else {
        await this.getAttentionAgain();
      }
    } else {
      await this.greetReceptionists();
    }
    this.receptionists!.stopTalking();
    await this.delay(2000);
    this.receptionists!.talk();
    await this.delay(1000);
  }

  private async getAttention(gettingAttentionText: MultilineText[]) {
    const text = gettingAttentionText[this.gettingAttentionIndex]!;
    if (this.gettingAttentionIndex === gettingAttentionText.length - 1) {
      this.inputController!.deactivate();
      await this.player!.walkTo(this.receptionists!.object.getCenter().x! + 24);
      this.player!.lookLeft();
      await this.delay(1000);
      await this.player!.shout(text);
      await this.delay(1000);
      this.receptionists!.look();
      await this.delay(1000);
      await this.startConversation();
      await this.delay(1000);
      this.receptionists!.stopTalking();
      this.inputController!.activate();
      this.receptionists!.resetTalk();
    } else {
      await this.player!.say(text);
    }
  }

  private async getAttentionAgain() {
    this.inputController!.deactivate();
    await this.player!.idle();
    const text = this.getText("receptionists", "getting-attention-again");
    await this.player!.say(text);
    await this.delay(500);
    this.receptionists!.look();
    await this.delay(2000);
    this.inputController!.activate();
  }

  private async greetReceptionists() {
    this.inputController!.deactivate();
    await this.player!.idle();
    await this.player!.say(this.getText("receptionists", "greet"));
    await this.delay(500);
    this.receptionists!.look();
    await this.delay(3000);
    this.inputController!.activate();
  }

  private async showCeoPictureSign() {
    return this.showPictureSign("ceo-picture-sign");
  }

  private async showPaintingSign() {
    return this.showPictureSign("painting-sign");
  }

  private async showPictureSign(textKey: string) {
    this.player!.idle();
    this.pictureSign!.setVisible(true);
    const text = this.getText(textKey);
    const title = this.add
      .bitmapText(
        this.renderer.width / 2,
        this.renderer.height / 2 - 12,
        fonts.heading1,
        text.title,
        undefined,
        1
      )
      .setOrigin(0.5)
      .setDepth(this.pictureSign!.depth)
      .setScrollFactor(0)
      .setTint(colors.blue);
    const description = this.add
      .bitmapText(
        this.renderer.width / 2,
        this.renderer.height / 2 + 12,
        fonts.normal,
        text.description,
        undefined,
        1
      )
      .setOrigin(0.5)
      .setDepth(this.pictureSign!.depth)
      .setScrollFactor(0)
      .setTint(colors.blue);
    await this.controls!.action.released();
    await this.controls!.right.released();
    await Control.anyPressed(this.controls!.action, this.controls!.right);
    title.destroy();
    description.destroy();
    this.pictureSign!.setVisible(false);
    await Control.allReleased(this.controls!.action, this.controls!.right);
  }

  private async startConversation() {
    this.receptionists!.speechType = "aggressive";
    for (const [person, text] of this.getText(
      "receptionists",
      "conversation"
    )) {
      await this.delay(500);
      if (person === 1) {
        await this.player!.say(text);
      } else {
        await this.receptionists!.say(text, 1);
      }
    }
  }

  private async takeCandy() {
    await this.player!.walkToReach(this.candies!);
    await this.player!.take("candy");
    this.waterDispenserStack!.visible = true;
  }

  private async useBarrierGate() {
    if (this.plasticCup.isInPossessionOfPlayer && this.plasticCup.isFull) {
      await this.player!.do();
      await this.barrierGate!.wreck();
      await this.delay(500);
      await this.player!.say(this.getText("barrier-gate", "spill-water"));
      await this.delay(1000);
      await this.player!.say(this.getText("barrier-gate", "is-wrecked"));
      this.nextState();
    } else {
      const comment = this.getText("barrier-gate", "badge-required")[
        this.barrierGateCommentIndex
      ]!;
      if (this.barrierGateCommentIndex === 0) {
        await new Promise<void>(resolve => {
          this.player!.do(resolve);
        });
        await this.delay(1000);
      }
      this.inputController!.activate();
      await this.player!.say(comment);
      if (this.barrierGateCommentIndex < 2) {
        this.barrierGateCommentIndex++;
      }
      if (this.barrierGateCommentIndex === 2) {
        this.playerNeedsBadge = true;
      }
      await this.delay(1000);
    }
  }

  protected processImageObjects(imageObjects: ImageObject[]) {
    for (const { key, image } of imageObjects) {
      switch (key) {
        case "candies": {
          this.candies = image;
          break;
        }
        case "ceo-picture": {
          this.ceoPicture = image;
          break;
        }
        case "painting": {
          this.painting = image;
          break;
        }
        case "water-dispenser-stack":
          this.waterDispenserStack = image.setVisible(false);
          break;
        case "window-frames":
          this.frames = image;
          break;
        case "window-reflections":
          this.reflections = image;
          break;
      }
    }
  }

  protected processNoImageObjects(noImageObjects: NoImageObject[]) {
    for (const { key, x, y } of noImageObjects) {
      switch (key) {
        case "barrier-gate":
          this.barrierGate = new BarrierGate(this, x, y);
          break;
        case "elevator-button":
          this.elevatorButton = new ElevatorButton(this, x, y);
          break;
        case "elevator-closed":
          this.elevatorLeft = new Elevator(this, x, y, "full", 9);
          break;
        case "elevator-open":
          this.elevatorRight = new Elevator(this, x, y, "empty", 1);
          break;
        case "receptionists":
          const gossip = this.getText("receptionists", "gossip");
          this.receptionists = new Receptionists(this, x, y, gossip);
          break;
        case "water-dispenser":
          this.waterDispenser = new WaterDispenser(this, x, y);
          break;
      }
    }
  }

  protected processZoneObjects(zoneObjects: ZoneObject[]) {
    const elevatorZones = this.physics.add.staticGroup();
    this.elevatorZoneCollider = this.physics.add.collider(
      this.player!.object,
      elevatorZones
    );
    this.elevatorZoneCollider.active = false;
    for (const { key, zone } of zoneObjects) {
      switch (key) {
        case "elevator-zone":
          elevatorZones.add(zone);
          break;
      }
    }
  }

  private nextState() {
    switch (this.state) {
      case State.Inital:
        this.state = State.BarrierGateIsWrecked;
        break;
      case State.BarrierGateIsWrecked:
        this.state = State.UsingElevator;
        break;
      case State.UsingElevator:
        this.complete(true);
        break;
    }
  }
}
