import { Collider, Image } from "../phaser";
import { ImageObject, NoImageObject, Scene, ZoneObject } from "./scene";
import { colors, sceneKeys } from "../config";

import { Cake } from "../sprite/cake";
import { Elevator } from "../sprite/elevator";
import { PLAYER_DEPTH } from "../sprite/player";
import { Person } from "../sprite/person";
import { Options as RectTransitionOptions } from "./rect-transition";
import { SittingPrince } from "../sprite/sitting-prince";
import { StandingPrince } from "../sprite/standing-prince";
import { Vector } from "../phaser";
import { WaterDispenser } from "../sprite/water-dispenser";
import { getDimensionVector } from "../helpers";

type ActionKey =
  | "ask-business-guy-for-help"
  | "business-guy-comment"
  | "chubby-woman-mention-cake"
  | "make-coffee"
  | "talk-to-business-guy"
  | "talk-to-chubby-woman"
  | "talk-to-sitting-prince"
  | "talk-to-standing-prince"
  | "use-water-dispenser";

const enum State {
  Inital,
  ExitingElevator,
  Exploring,
}

export class FifthFloorScene extends Scene<void, ActionKey> {
  private state = State.Inital;

  private businessGuy?: Person<Image>;

  private cake?: Cake;

  private chubbyWoman?: Person<Image>;

  private coffeeMachine?: Image;

  private dimensions = { width: 912, height: 128 };

  private elevatorRight?: Elevator;

  private elevatorZoneCollider?: Collider;

  private playerHasCoffee = false;

  private sittingPrince?: SittingPrince;

  private standingPrince?: StandingPrince;

  private tallMan?: Image;

  private waterDispenser?: WaterDispenser;

  private waterDispenserIndex = 0;

  constructor() {
    super("fifth-floor");
  }

  public create() {
    super.create();

    this.setBounds(this.dimensions.width, this.dimensions.height);

    this.paintSky("light");

    this.addPlayer(0, this.dimensions.height - 48);
    this.player!.putOnBackpack();

    const layers = this.processTileMap("fifth-floor", "fifth-floor", [
      "cake",
      "elevator-closed",
      "elevator-open",
      "sitting-prince",
      "standing-prince",
      "water-dispenser",
    ]);

    this.elevatorRight!.object.setDepth(PLAYER_DEPTH + 1);
    this.elevatorRight!.display.setDepth(PLAYER_DEPTH + 1);

    this.player!.object.setX(this.elevatorRight!.object.getCenter().x! - 10);
    this.player!.startCameraFollow();

    this.physics.add.collider(this.player!.object, layers.get("Ground")!);

    this.createActions();

    this.inputController!.deactivate();

    this.runStartTransition();
  }

  public update(time: number, delta: number) {
    if (this.isComplete) {
      return;
    }
    super.update(time, delta);
    switch (this.state) {
      case State.Exploring:
        this.processActions(
          "use-water-dispenser",
          "ask-business-guy-for-help",
          "talk-to-business-guy",
          "talk-to-chubby-woman",
          "talk-to-sitting-prince",
          "talk-to-standing-prince",
          "make-coffee",
          "chubby-woman-mention-cake",
          "business-guy-comment"
        );
        break;
    }
  }

  private async askBusinessGuyForHelp() {
    await this.player!.walkTo(this.businessGuy!.getCenter().x! - 16);
    this.player!.lookRight();
    this.businessGuy!.unsay();
    const conversation = this.getText("business-guy", "ask-for-help");
    for (const [index, [person, text]] of conversation.entries()) {
      if (index > 0) {
        await this.delay(500);
      }
      if (person === 1) {
        await this.player!.say(text);
      } else {
        await this.businessGuy!.say(text);
      }
    }
  }

  private async exitElevator() {
    await this.elevatorRight!.open();
    this.elevatorRight!.object.setDepth(0);
    await this.player!.walkTo(this.player!.object.x + 40);
    this.elevatorZoneCollider!.active = false;
    this.elevatorRight!.close();
    this.inputController!.activate();
    this.nextState();
  }

  private async businessGuyComment() {
    if (this.getAction("talk-to-business-guy")!.isComplete) {
      await this.businessGuy!.say(this.getText("business-guy", "comment"));
    } else {
      this.businessGuy!.say(this.getText("business-guy", "greeting"));
    }
  }

  private async makeCoffee() {
    await this.player!.walkToReach(this.coffeeMachine!);
    if (this.getAction("talk-to-chubby-woman")!.isComplete) {
      for (const [text, action] of this.getText(
        "coffee-machine",
        "make-coffee-monologue"
      )) {
        await this.delay(500);
        switch (action) {
          case "start-coffee-machine":
            await this.delay(500);
            this.getSound("coffee-machine").setVolume(0.25).play();
            await this.delay(500);
            break;
          case "stop-coffee-machine":
            this.sound.stopByKey("coffee-machine");
            await this.delay(500);
            await this.player!.take("coffee-mug");
            break;
        }
        await this.delay(500);
        await this.player!.say(text);
      }
      this.playerHasCoffee = true;
      this.sittingPrince!.object.setVisible(false);
      this.standingPrince!.object.setVisible(true);
      this.cake!.empty();
      this.inputController?.activate();
    } else {
      await this.delay(1000);
      this.inputController?.activate();
      await this.player!.say(this.getText("coffee-machine", "is-broken"));
    }
  }

  private async runStartTransition() {
    // not sure why the y offset is required
    const fromPositionOffset = new Vector(0, 22);

    const fromPosition = this.getLocalCoordinates(
      this.elevatorRight!.object
    ).add(fromPositionOffset);
    const fromDimensions = getDimensionVector(this.elevatorRight!.object).add(
      new Vector(-1, 0)
    );
    await new Promise<void>(resolve => {
      const options: RectTransitionOptions = {
        fromPosition,
        fromDimensions,
        toPosition: fromPosition,
        toDimensions: fromDimensions,
        callback: resolve,
      };
      this.scene.launch(sceneKeys.rectTransition, options);
    });
    await new Promise<void>(resolve => {
      const options: RectTransitionOptions = {
        fromPosition,
        fromDimensions,
        toPosition: new Vector(
          this.renderer.width / 2,
          this.renderer.height / 2
        ),
        toDimensions: new Vector(this.renderer.width, this.renderer.height),
        callback: resolve,
      };
      this.scene.launch(sceneKeys.rectTransition, options);
    });
    this.scene.stop(sceneKeys.rectTransition);
    this.nextState();
  }

  private async talkToBusinessGuy() {
    await this.player!.walkTo(this.businessGuy!.getCenter().x! - 16);
    this.player!.lookRight();
    this.businessGuy!.unsay();
    const conversation = this.getText("business-guy", "conversation");
    for (const [index, [person, text]] of conversation.entries()) {
      if (index > 0) {
        await this.delay(500);
      }
      if (person === 1) {
        await this.player!.say(text);
      } else {
        await this.businessGuy!.say(text);
      }
    }
  }

  private async talkToChubbyWoman() {
    await this.player!.walkTo(this.chubbyWoman!.getCenter().x! + 20);
    this.player!.lookLeft();
    this.chubbyWoman!.unsay();
    const conversation = this.getText("chubby-woman", "conversation");
    for (const [person, text] of conversation) {
      await this.delay(500);
      if (person === 1) {
        await this.player!.say(text);
      } else {
        await this.chubbyWoman!.say(text);
      }
    }
  }

  private async talkToSittingPrince() {
    await this.player!.walkTo(this.sittingPrince!.object.getCenter().x! - 40);
    this.player!.lookRight();
    const conversation = this.getText("sitting-prince", "conversation");
    for (const [person, text, type] of conversation) {
      await this.delay(500);
      if (person === 1) {
        if (type === "think") {
          await this.delay(1000);
          await this.player!.think(text);
        } else {
          await this.player!.say(text);
        }
      } else if (person === 2) {
        this.player!.lookRight();
        await this.sittingPrince!.moveEyes();
      } else {
        this.player!.lookLeft();
        await this.say(this.tallMan!, text, {
          colors: { fill: colors.grayBlue, text: colors.white },
          offsetX: 1,
          offsetY: -7,
        });
      }
    }
    this.cake!.object.setVisible(true);
  }

  private async talkToStandingPrince() {
    await this.player!.walkTo(this.standingPrince!.getCenter().x! - 16);
    this.player!.lookRight();
    const conversation = this.getText("standing-prince", "conversation");
    for (const [person, text, type] of conversation) {
      await this.delay(1000);
      if (person === 1) {
        if (type === "think") {
          await this.delay(2000);
          await this.player!.think(text);
        } else {
          await this.player!.say(text);
        }
      } else if (person === 2) {
        if (type === "let-loose") {
          await this.delay(500);
          this.standingPrince!.letLoose();
          await this.delay(1000);
        } else if (type === "turn-left") {
          await this.delay(500);
          this.standingPrince!.drawInTummy();
          await this.delay(1000);
          this.standingPrince!.turnLeft();
        } else {
          await this.standingPrince!.say(text);
        }
      }
    }
    this.nextState();
  }

  private async useWaterDispenser() {
    const comments = this.getText("water-dispenser", "comments");
    if (!this.waterDispenser!.isEmpty) {
      await this.player!.walkToReach(this.waterDispenser!.object);
      await this.player!.take("plastic-cup-full", async () => {
        await this.delay(3000);
        this.waterDispenser!.waterLevel = 0.75 - this.waterDispenserIndex / 4;
      });
    }
    await this.player!.say(comments[this.waterDispenserIndex]);
    this.inputController!.activate();
    if (this.waterDispenserIndex < comments.length - 1) {
      this.waterDispenserIndex++;
    }
    await this.delay(1000);
  }

  protected processImageObjects(imageObjects: ImageObject[]) {
    for (const { key, image } of imageObjects) {
      switch (key) {
        case "business-guy":
          this.businessGuy = new Person(image)
            .setBalloonColors({ fill: colors.blue, text: colors.white })
            .setBalloonOffset(new Vector(-1, -7));
          break;
        case "chubby-woman":
          this.chubbyWoman = new Person(image)
            .setBalloonColors({ fill: colors.burgundy, text: colors.white })
            .setBalloonOffset(new Vector(0, -7));
          break;
        case "coffee-machine":
          this.coffeeMachine = image;
          break;
        case "tall-man":
          this.tallMan = image;
          break;
      }
    }
  }

  protected processNoImageObjects(noImageObjects: NoImageObject[]) {
    for (const { key, x, y } of noImageObjects) {
      switch (key) {
        case "cake":
          this.cake = new Cake(this, x, y);
          this.cake.object.setVisible(false);
          break;
        case "elevator-closed":
          new Elevator(this, x, y, "full", 0);
          break;
        case "elevator-open":
          this.elevatorRight = new Elevator(this, x, y, "empty", 5);
          break;
        case "sitting-prince":
          this.sittingPrince = new SittingPrince(this, x, y);
          break;
        case "standing-prince":
          this.standingPrince = new StandingPrince(this, x, y);
          this.standingPrince.object.setVisible(false);
          break;
        case "water-dispenser":
          this.waterDispenser = new WaterDispenser(this, x, y);
          this.waterDispenser.waterLevel = 1;
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
    for (const { key, zone } of zoneObjects) {
      switch (key) {
        case "elevator-zone":
          elevatorZones.add(zone);
          break;
      }
    }
  }

  private createActions() {
    this.createAction("use-water-dispenser", () => this.useWaterDispenser(), {
      precondition: () =>
        this.player!.isInRangeTo(this.waterDispenser!.object, 16),
      autoReset: true,
      deactivateInputController: true,
      showActionHint: true,
    });
    const askBusinessGuyForHelpAction = this.createAction(
      "ask-business-guy-for-help",
      () => this.askBusinessGuyForHelp(),
      {
        precondition: () =>
          talkToBusinessGuyAction.isComplete &&
          makeCoffeeAction.executionCount > 0 &&
          this.waterDispenser!.isEmpty &&
          this.player!.isInRangeTo(this.businessGuy!.object, 16),
        deactivateInputController: true,
        showActionHint: true,
      }
    );
    this.createAction("business-guy-comment", () => this.businessGuyComment(), {
      precondition: () =>
        this.player!.isInRangeTo(this.businessGuy!.object, 32),
      resetCondition: () =>
        !this.player!.isInRangeTo(this.businessGuy!.object, 32),
    });
    const makeCoffeeAction = this.createAction(
      "make-coffee",
      () => this.makeCoffee(),
      {
        precondition: () => this.player!.isInRangeTo(this.coffeeMachine!, 16),
        resetCondition: () => !this.playerHasCoffee,
        deactivateInputController: true,
        reactivateInputController: false,
        showActionHint: true,
      }
    );
    const chubbyWomanMentionCakeAction = this.createAction(
      "chubby-woman-mention-cake",
      () =>
        this.chubbyWoman!.say(this.getText("chubby-woman", "mentions-cake")),
      {
        precondition: () =>
          this.cake!.object.visible &&
          this.player!.isInRangeTo(this.chubbyWoman!.object, 32),
      }
    );
    const talkToBusinessGuyAction = this.createAction(
      "talk-to-business-guy",
      () => this.talkToBusinessGuy(),
      {
        precondition: () =>
          this.player!.isInRangeTo(this.businessGuy!.object, 16),
        deactivateInputController: true,
        showActionHint: true,
      }
    );
    this.createAction("talk-to-chubby-woman", () => this.talkToChubbyWoman(), {
      precondition: () =>
        chubbyWomanMentionCakeAction.isComplete &&
        this.player!.isInRangeTo(this.chubbyWoman!.object, 16),
      deactivateInputController: true,
      showActionHint: true,
    });
    this.createAction(
      "talk-to-sitting-prince",
      () => this.talkToSittingPrince(),
      {
        precondition: () =>
          askBusinessGuyForHelpAction.isComplete &&
          this.player!.object.x > this.sittingPrince!.object.x - 76 &&
          this.player!.object.x < this.sittingPrince!.object.x - 60,
        deactivateInputController: true,
        showActionHint: true,
      }
    );
    this.createAction(
      "talk-to-standing-prince",
      () => this.talkToStandingPrince(),
      {
        precondition: () =>
          this.standingPrince!.object.visible &&
          this.player!.isInRangeTo(this.standingPrince!.object, 16),
        deactivateInputController: true,
        showActionHint: true,
      }
    );
  }

  private nextState() {
    switch (this.state) {
      case State.Inital:
        this.state = State.ExitingElevator;
        this.exitElevator();
        break;
      case State.ExitingElevator:
        this.state = State.Exploring;
        break;
      case State.Exploring:
        this.complete();
        break;
    }
  }
}
