import { ATLAS_KEY, colors, fonts, sceneKeys } from "../config";
import { Collider, Image, Zone } from "../phaser";
import { ImageObject, NoImageObject, Scene, ZoneObject } from "./scene";
import {
  createSpriteAnimations,
  easing,
  events,
  getImageKey,
  moveObjectTo,
} from "../helpers";

import { Airplane } from "../sprite/airplane";
import { AirportPrince } from "../sprite/airport-prince";
import { Escalator } from "../sprite/escalator";
import { FollowMeCar } from "../sprite/follow-me-car";
import { PLAYER_DEPTH } from "../sprite/player";
import { Person } from "../sprite/person";
import { Options as RectTransitionOptions } from "./rect-transition";
import { ServoController } from "../servo-controller";
import { Vector } from "../phaser";
import { VehicleInputController } from "../input";
import { log } from "../utilities";
import phaser from "phaser";
import { registryKeys } from "../game";

type ActionKey =
  | "business-guy-comment"
  | "buy-wine"
  | "compliment-airport"
  | "enter-follow-me-car"
  | "fail-to-put-backpack-on-conveyor"
  | "forbid-looking"
  | "lost-and-found-stand-in-sight"
  | "open-suitcase"
  | "put-backpack-with-cash-on-conveyor"
  | "put-backpack-with-wine-on-conveyor"
  | "request-to-put-luggage-on-conveyor"
  | "search-toilet"
  | "take-backpack"
  | "take-off"
  | "take-wine"
  | "talk-to-saleswoman-about-lacking-money-1"
  | "talk-to-saleswoman-about-lacking-money-2"
  | "talk-to-saleswoman-about-lost-backpack"
  | "talk-to-saleswoman-about-money";

type Container = phaser.GameObjects.Container;

const overlaps = phaser.Geom.Rectangle.Overlaps;

const enum State {
  Inital,
  Exploring,
  LookingForBackpack,
  AskingForBackpack,
  LookingForLostAndFoundStand,
  TakingBackpack,
  FailingSecurityCheck,
  BuyingWine,
  TakingWine,
  PassingSecurityCheck,
  Taxiway,
  Runway,
  EndTransition,
}

export class AirportScene extends Scene<void, ActionKey> {
  private state = State.Inital;

  private airplane?: Airplane;

  private airplaneColliders?: { player: Collider; prince: Collider };

  private buildingReflections: Image[] = [];

  private buildingWindows: Image[] = [];

  private backpack?: Image;

  private businessGuy?: Person<Image>;

  private followMeCarInputController?: VehicleInputController;

  private dimensions = { width: 6016, height: 224 };

  private escalators: Escalator[] = [];

  private followMeCar?: FollowMeCar;

  private lostAndFoundStand?: Image;

  private playerStartPositionX = 0;

  private prince?: AirportPrince;

  private revolvingDoorZoneCollider?: Collider;

  private saleswoman?: Person<Image>;

  private securityConveyor?: Image;

  private startZone?: Zone;

  private stateOfficer?: Person<Image>;

  private suitcase?: Image;

  private toiletForeground?: Image;

  private toiletZoneCollider?: Collider;

  private windowReflectionContainer?: Container;

  private wineBottle?: Image;

  constructor() {
    super("airport");
  }

  public create() {
    super.create();

    this.setBounds(this.dimensions.width, this.dimensions.height);

    this.paintSky("light");

    this.addPlayer(0, this.dimensions.height - 48);
    this.player!.startCameraFollow();

    this.windowReflectionContainer = this.add.container(0, 0);

    const layers = this.processTileMap("airport", "airport", [
      "airplane",
      "escalator-stairs",
      "follow-me-car",
      "prince",
    ]);

    this.playerStartPositionX = this.toiletForeground!.x + 49;
    this.player!.object.setX(this.playerStartPositionX);
    this.createActions();

    for (const [window, reflections] of this.buildingWindows.map(
      (airportWindow, index) => [airportWindow, this.buildingReflections[index]]
    )) {
      if (window !== undefined && reflections !== undefined) {
        const mask = this.make
          .graphics(undefined, false)
          .fillRect(window.x, window.y, window.width, window.height)
          .setScrollFactor(window.scrollFactorX, window.scrollFactorY)
          .createGeometryMask();
        this.add
          .container(0, 0)
          .setDepth(reflections.depth)
          .add(reflections)
          .setMask(mask);
      }
    }

    this.physics.add.collider(this.player!.object, layers.get("Ground")!);
    this.airplaneColliders = {
      player: this.physics.add.collider(
        this.player!.object,
        this.airplane!.object
      ),
      prince: this.physics.add.collider(
        this.prince!.object,
        this.airplane!.object
      ),
    };
    this.airplaneColliders.player.active = false;
    this.airplaneColliders.prince.active = false;

    for (const escalator of this.escalators) {
      escalator.addCollider(this.player!.object);
    }
    this.physics.world.on(events.world.step, () => {
      for (const escalator of this.escalators) {
        escalator.update();
      }
    });
    for (const escalator of this.escalators) {
      escalator.start();
    }

    this.followMeCar!.targetLeft();
    this.followMeCarInputController = new VehicleInputController(
      this.followMeCar!,
      this.controls!
    );
    this.followMeCarInputController.deactivate(false);

    this.cameras.main.setBounds(
      this.playerStartPositionX,
      0,
      this.dimensions.width - this.playerStartPositionX,
      this.dimensions.height
    );
  }

  public update(time: number, delta: number) {
    if (this.isComplete) {
      return;
    }
    this.followMeCarInputController!.update();
    super.update(time, delta);
    switch (this.state) {
      case State.Inital:
        this.processActions("compliment-airport");
        break;
      case State.Exploring:
        this.processActions(
          "business-guy-comment",
          "fail-to-put-backpack-on-conveyor",
          "forbid-looking",
          "request-to-put-luggage-on-conveyor",
          "talk-to-saleswoman-about-lacking-money-1"
        );
        break;
      case State.LookingForBackpack:
        this.processActions(
          "business-guy-comment",
          "talk-to-saleswoman-about-lacking-money-2",
          "search-toilet"
        );
        break;
      case State.AskingForBackpack:
        this.processActions(
          "business-guy-comment",
          "search-toilet",
          "talk-to-saleswoman-about-lost-backpack"
        );
        break;
      case State.LookingForLostAndFoundStand:
        this.processActions(
          "business-guy-comment",
          "lost-and-found-stand-in-sight",
          "open-suitcase"
        );
        break;
      case State.TakingBackpack:
        this.processActions("take-backpack");
        break;
      case State.FailingSecurityCheck:
        this.processActions(
          "business-guy-comment",
          "put-backpack-with-cash-on-conveyor",
          "request-to-put-luggage-on-conveyor",
          "talk-to-saleswoman-about-money"
        );
        break;
      case State.BuyingWine:
        this.processActions("buy-wine");
        break;
      case State.TakingWine:
        this.processActions("take-wine");
        break;
      case State.PassingSecurityCheck:
        this.processActions(
          "put-backpack-with-wine-on-conveyor",
          "request-to-put-luggage-on-conveyor"
        );
        break;
      case State.Taxiway:
        this.processActions("enter-follow-me-car");
        this.updateAirplane();
        break;
      case State.Runway:
        this.processActions("take-off");
        break;
    }
  }

  private createActions() {
    this.createAction("compliment-airport", () => this.complimentAirport(), {
      precondition: () =>
        this.player!.object.x > this.playerStartPositionX + 128,
      deactivateInputController: true,
    });
    this.createAction(
      "forbid-looking",
      () => this.player!.say(this.getText("player", "do-not-look")),
      {
        precondition: () =>
          this.player!.object.x < this.playerStartPositionX + 48,
        resetCondition: () =>
          this.player!.object.x > this.playerStartPositionX + 128,
      }
    );
    this.createAction("business-guy-comment", () => this.businessGuyComment(), {
      precondition: () =>
        this.player!.isInRangeTo(this.businessGuy!.object, 48),
    });
    this.createAction(
      "talk-to-saleswoman-about-lacking-money-1",
      () => this.talkToSalesWomanAboutLackingMoney1(),
      {
        precondition: () =>
          this.player!.isInRangeTo(this.saleswoman!.object, 32),
        deactivateInputController: true,
      }
    );
    this.createAction(
      "talk-to-saleswoman-about-lacking-money-2",
      () => this.talkToSalesWomanAboutLackingMoney2(),
      {
        precondition: () =>
          this.player!.isInRangeTo(this.saleswoman!.object, 32),
        deactivateInputController: true,
      }
    );
    this.createAction(
      "talk-to-saleswoman-about-lost-backpack",
      () => this.talkToSalesWomanAboutLostBackpack(),
      {
        precondition: () =>
          this.player!.isInRangeTo(this.saleswoman!.object, 32),
        deactivateInputController: true,
        showActionHint: true,
      }
    );
    this.createAction(
      "request-to-put-luggage-on-conveyor",
      () => this.requestToPutLuggageOnConveyor(),
      {
        precondition: () =>
          this.player!.isInRangeTo(this.stateOfficer!.object, 56),
      }
    );
    this.createAction(
      "fail-to-put-backpack-on-conveyor",
      () => this.failToPutBackpackOnConveyor(),
      {
        precondition: () =>
          this.getAction("request-to-put-luggage-on-conveyor")!.isComplete &&
          overlaps(
            this.player!.object.getBounds(),
            this.securityConveyor!.getBounds()
          ),
        deactivateInputController: true,
        showActionHint: true,
      }
    );
    this.createAction(
      "put-backpack-with-cash-on-conveyor",
      () => this.putBackpackWithCashOnConveyor(),
      {
        precondition: () =>
          this.getAction("request-to-put-luggage-on-conveyor")!.isComplete &&
          overlaps(
            this.player!.object.getBounds(),
            this.securityConveyor!.getBounds()
          ),
        deactivateInputController: true,
        showActionHint: true,
      }
    );
    this.createAction("search-toilet", () => this.searchToilet(), {
      precondition: () => this.player!.object.x < this.playerStartPositionX,
      resetCondition: () =>
        this.player!.object.x > this.playerStartPositionX + 48,
    });
    this.createAction(
      "lost-and-found-stand-in-sight",
      () =>
        this.player!.say(this.getText("lost-and-found", "suitcase-comment")),
      {
        precondition: () =>
          Math.abs(
            this.player!.getCenter().x - this.lostAndFoundStand!.getCenter().x!
          ) < 56,
      }
    );
    this.createAction("open-suitcase", () => this.openSuitcase(), {
      precondition: () =>
        Math.abs(this.player!.getCenter().x - this.suitcase!.getCenter().x!) <
        16,
      deactivateInputController: true,
      showActionHint: true,
    });
    this.createAction("take-backpack", () => this.takeBackpack(), {
      precondition: () => this.player!.isInRangeTo(this.backpack!, 16),
      deactivateInputController: true,
      showActionHint: true,
    });
    this.createAction(
      "talk-to-saleswoman-about-money",
      () => this.talkToSalesWomanAboutMoney(),
      {
        precondition: () =>
          this.player!.isInRangeTo(this.saleswoman!.object, 32),
        deactivateInputController: true,
      }
    );
    this.createAction("buy-wine", () => this.buyWine(), {
      precondition: () => this.player!.isInRangeTo(this.saleswoman!.object, 32),
      deactivateInputController: true,
      showActionHint: true,
    });
    this.createAction("take-wine", () => this.takeWine(), {
      precondition: () => this.player!.isInRangeTo(this.wineBottle!, 16),
      deactivateInputController: true,
      showActionHint: true,
    });
    this.createAction(
      "put-backpack-with-wine-on-conveyor",
      () => this.putBackpackWithWineOnConveyor(),
      {
        precondition: () =>
          this.getAction("request-to-put-luggage-on-conveyor")!.isComplete &&
          overlaps(
            this.player!.object.getBounds(),
            this.securityConveyor!.getBounds()
          ),
        deactivateInputController: true,
        showActionHint: true,
      }
    );
    this.createAction("enter-follow-me-car", () => this.enterFollowMeCar(), {
      precondition: () =>
        overlaps(
          this.player!.object.getBounds(),
          this.followMeCar!.object.getBounds()
        ),
      deactivateInputController: true,
      reactivateInputController: false,
      showActionHint: true,
      showLock: false,
    });
    this.createAction("take-off", () => this.takeOff(), {
      precondition: () =>
        Math.abs(
          this.player!.getCenter().x - this.airplane!.object.getCenter().x!
        ) < 32,
    });
  }

  private async businessGuyComment() {
    const comments = this.getText("business-guy", "comments");
    switch (this.state) {
      case State.Exploring:
        this.businessGuy!.say(comments[0]);
        break;
      case State.LookingForBackpack:
        this.businessGuy!.say(comments[1]);
        break;
      case State.AskingForBackpack:
        const direction = Math.sign(this.player!.object.body.velocity.x);
        await Promise.all([
          this.businessGuy!.say(comments[2]),
          (async () => {
            this.inputController!.deactivate();
            await this.delay(500, true);
            this.player!.idle();
          })(),
        ]);
        await this.delay(2000);
        await this.player!.walkTo(
          this.businessGuy!.getCenter().x! + direction * 48
        );
        await this.delay(2000);
        if (direction < 0) {
          this.player!.lookRight();
        } else {
          this.player!.lookLeft();
        }
        await this.delay(1000);
        await this.player!.walkTo(
          this.businessGuy!.getCenter().x! + direction * 16
        );
        await this.delay(500);
        const conversation = this.getText("business-guy", "conversation");
        for (const [person, text] of conversation) {
          await this.delay(500);
          if (person === 1) {
            await this.player!.say(text);
          } else {
            await this.businessGuy!.say(text);
          }
        }
        this.inputController!.activate();
        break;
      case State.LookingForLostAndFoundStand:
        this.businessGuy!.say(comments[3]);
        break;
      case State.FailingSecurityCheck:
        this.businessGuy!.say(comments[4]);
        break;
    }
  }

  private async buyWine() {
    await this.player!.walkTo(this.saleswoman!.object.x - 12);
    if (this.player!.looksLeft) {
      await this.delay(250);
      this.player!.lookRight();
    }
    await this.delay(500);
    const conversation = this.getText("saleswoman", "buying-wine-conversation");
    for (const [index, [person, text]] of conversation.entries()) {
      if (index > 0) {
        await this.delay(500);
      }
      if (person === 1) {
        await this.player!.say(text);
      } else {
        await this.saleswoman!.say(text);
      }
    }
    this.wineBottle!.setVisible(true);
    this.nextState();
  }

  private async complimentAirport() {
    const monologue = this.getText("player", "compliment-airport-monologue");
    for (const [index, text] of monologue.entries()) {
      if (index > 0) {
        await this.delay(500);
      }
      await this.player!.say(text);
    }
    this.nextState();
  }

  private async enterFollowMeCar() {
    this.followMeCarInputController!.deactivate();
    const carTargetsLeft = this.followMeCar!.targetsLeft;
    await this.player!.walkTo(this.followMeCar!.getHandleDoorPosition());
    if (carTargetsLeft) {
      this.player!.lookLeft();
    } else {
      this.player!.lookRight();
    }
    await this.delay(500);
    await this.followMeCar!.openDoor();
    await this.delay(250);
    await this.player!.walkTo(this.followMeCar!.getEnterExitPosition(), true);
    this.player!.object.setVisible(false);
    this.followMeCar!.enter();
    this.cameras.main.stopFollow();
    await this.delay(250);
    await this.followMeCar!.closeDoor();
    await this.delay(250);
    await this.followMeCar!.openWindow();
    const cameraScrollPosition = new Vector(
      this.followMeCar!.object.getCenter().x! - this.renderer.width / 2,
      this.cameras.main.scrollY
    );
    await this.scrollCamera(cameraScrollPosition, 1000, easing.quad.inOut);
    await this.delay(250);
    await this.followMeCar!.startEngine();
    this.followMeCarInputController!.activate();
    this.followMeCar!.startCameraFollow();
  }

  private async exitFollowMeCar() {
    this.followMeCarInputController!.deactivate(false);
    const carTargetsLeft = this.followMeCar!.targetsLeft;
    await this.followMeCar!.stop();
    this.player!.object.setX(
      this.followMeCar!.getEnterExitPosition() - this.player!.object.width / 2
    );
    await this.delay(250);
    this.cameras.main.stopFollow();
    const cameraScrollPosition = new Vector(
      this.player!.object.x +
        (this.player!.object.width - this.renderer.width) / 2,
      this.cameras.main.scrollY
    );
    await this.scrollCamera(cameraScrollPosition, 1000, easing.quad.inOut);
    await this.delay(250);
    await this.followMeCar!.stopEngine();
    await this.delay(250);
    await this.followMeCar!.closeWindow();
    await this.delay(250);
    await this.followMeCar!.openDoor();
    await this.delay(250);
    this.followMeCar!.exit();
    if (carTargetsLeft) {
      this.player!.lookLeft();
    } else {
      this.player!.lookRight();
    }
    this.player!.object.setVisible(true);
    this.player!.startCameraFollow();
    await this.delay(250);
    await this.player!.walkTo(this.followMeCar!.getHandleDoorPosition());
    if (carTargetsLeft) {
      this.player!.lookLeft();
    } else {
      this.player!.lookRight();
    }
    await this.delay(250);
    await this.followMeCar!.closeDoor();
    this.inputController!.activate();
  }

  private async openSuitcase() {
    await this.player!.walkTo(this.lostAndFoundStand!.x + 32);
    this.player!.lookLeft();
    const monologue = this.getText("lost-and-found", "open-suitcase-monologue");
    for (const text of monologue) {
      await this.delay(500);
      await this.player!.say(text);
    }
    await this.delay(500);
    await Promise.all([
      (async () => {
        await this.delay(1000);
        await moveObjectTo(
          this.suitcase!,
          new Vector(this.suitcase!.x - 9, this.suitcase!.y),
          8
        );
      })(),
      this.player!.say(this.getText("lost-and-found", "backpack-is-visible")),
    ]);
    this.nextState();
  }

  private async putBackpackWithWineOnConveyor() {
    await this.putBackpackOnConveyor();
    const conversation = this.getText(
      "state-officer",
      "pepperspray-conversation"
    );
    for (const [person, text] of conversation) {
      await this.delay(500);
      if (person === 1) {
        await this.player!.say(text);
      } else {
        await this.stateOfficer!.say(text);
      }
    }
    await this.delay(500);
    await this.takeBackpackFromConveyor();
    this.nextState();
  }

  private async putBackpackOnConveyor() {
    await this.player!.walkTo(this.securityConveyor!.x + 8);
    if (this.player!.looksLeft) {
      await this.delay(250);
      this.player!.lookRight();
    }
    await this.delay(500);
    if (await this.player!.takeOffBackpack()) {
      await this.delay(250);
      const position = new Vector(
        this.securityConveyor!.x + 3,
        this.securityConveyor!.y - 3
      );
      this.backpack!.setPosition(position.x, position.y).setVisible(true);
      position.x = this.securityConveyor!.getRightCenter().x! - 11;
      await moveObjectTo(this.backpack!, position, 4);
      await this.player!.walkToReach(this.backpack!);
    }
  }

  private async searchToilet() {
    this.player!.say(this.getText("player", "search-toilet"));
    if (this.state === State.LookingForBackpack) {
      this.nextState();
    }
  }

  private async takeBackpack() {
    await this.player!.say(this.getText("lost-and-found", "take-backpack"));
    await this.delay(1000);
    await this.player!.walkToReach(this.backpack!);
    await this.player!.take("backpack", () => {
      this.backpack!.setVisible(false);
      this.player!.putOnBackpack();
    });
    await this.delay(1000);
    await this.player!.say(this.getText("lost-and-found", "backpack-comment"));
    this.nextState();
  }

  private async requestToPutLuggageOnConveyor() {
    const conversation = this.getText("state-officer", "conveyor-conversation");
    for (const [index, [person, text]] of conversation.entries()) {
      if (index > 0) {
        await this.delay(500);
      }
      if (person === 1) {
        await this.player!.say(text);
      } else {
        await this.stateOfficer!.say(text);
      }
    }
  }

  private async failToPutBackpackOnConveyor() {
    await this.putBackpackOnConveyor();
    const monologue = this.getText("player", "forgotten-backpack-monologue");
    for (const [index, [text, type]] of monologue.entries()) {
      if (index > 0) {
        await this.delay(1000);
      }
      if (type === "shout") {
        await this.player!.shout(text);
      } else {
        await this.player!.say(text);
      }
    }
    this.nextState();
  }

  private async putBackpackWithCashOnConveyor() {
    await this.putBackpackOnConveyor();
    const conversation = this.getText(
      "state-officer",
      "exceeded-cash-limit-conversation"
    );
    for (const [person, text] of conversation) {
      await this.delay(500);
      if (person === 1) {
        await this.player!.say(text);
      } else {
        await this.stateOfficer!.say(text);
      }
    }
    await this.delay(500);
    await this.takeBackpackFromConveyor();
    this.nextState();
  }

  private async talkToSalesWomanAboutLackingMoney1() {
    const conversation = this.getText(
      "saleswoman",
      "lacking-money-conversation-1"
    );
    for (const [index, [person, text]] of conversation.entries()) {
      if (index > 0) {
        await this.delay(500);
      }
      if (person === 1) {
        await this.player!.say(text);
      } else {
        await this.saleswoman!.say(text);
      }
    }
  }

  private async talkToSalesWomanAboutLackingMoney2() {
    const conversation = this.getText(
      "saleswoman",
      "lacking-money-conversation-2"
    );
    for (const [index, [person, text]] of conversation.entries()) {
      if (index > 0) {
        await this.delay(500);
      }
      if (person === 1) {
        await this.player!.say(text);
      } else {
        await this.saleswoman!.say(text);
      }
    }
  }

  private async talkToSalesWomanAboutLostBackpack() {
    await this.player!.walkTo(this.saleswoman!.object.x - 12);
    if (this.player!.looksLeft) {
      await this.delay(250);
      this.player!.lookRight();
    }
    await this.delay(500);
    const conversation = this.getText(
      "saleswoman",
      "lost-backpack-conversation"
    );
    for (const [index, [person, text]] of conversation.entries()) {
      if (index > 0) {
        await this.delay(500);
      }
      if (person === 1) {
        await this.player!.say(text);
      } else {
        await this.saleswoman!.say(text);
      }
    }
    this.nextState();
  }

  private async talkToSalesWomanAboutMoney() {
    const conversation = this.getText(
      "saleswoman",
      "not-my-money-conversation"
    );
    for (const [index, [person, text]] of conversation.entries()) {
      if (index > 0) {
        await this.delay(500);
      }
      if (person === 1) {
        await this.player!.say(text);
      } else {
        await this.saleswoman!.say(text);
      }
    }
  }

  private async takeBackpackFromConveyor() {
    await this.delay(500);
    await this.player!.take("backpack", () => {
      this.backpack!.setVisible(false);
      this.player!.putOnBackpack();
    });
  }

  private async takeWine() {
    await this.player!.walkToReach(this.wineBottle!);
    await this.player!.take("wine-bottle", () => {
      this.wineBottle!.setVisible(false);
    });
    this.nextState();
  }

  private openLostAndFoundArea() {
    this.cameras.main.setBounds(
      0,
      0,
      this.dimensions.width,
      this.dimensions.height
    );
    this.toiletZoneCollider!.active = false;
    this.toiletForeground!.setDepth(0.5);
  }

  private openTaxiway() {
    this.revolvingDoorZoneCollider!.active = false;
  }

  private async propose() {
    for (const [person, text, action] of this.getText("prince", "propose")) {
      if (person === 1) {
        if (action === "look-right") {
          this.player!.lookRight();
          await this.delay(500);
        } else {
          await this.player!.say(text);
        }
      } else {
        switch (action) {
          case "idle":
            this.prince!.idle();
            break;
          case "smile":
            this.prince!.smile();
            await this.delay(500);
            break;
          default:
            await this.prince!.say(text);
            break;
        }
      }
      await this.delay(500);
    }
    await this.delay(1000);
    await this.prince!.takeRingOut();
    await this.delay(750);
    (async () => {
      await this.prince!.loseRing();
      await this.delay(500, true);
      this.prince!.lookRight();
      this.prince!.beShocked();
    })();
    await this.startRingFlight();
  }

  private async pushRealLifeRing() {
    const controller: ServoController | undefined = this.registry.get(
      registryKeys.servoController
    );
    if (controller !== undefined) {
      try {
        await controller.moveRingServo("push");
      } catch (error) {
        log.error("Could not reach servo controller.");
      }
    }
  }

  private async runEndTransition() {
    const toPosition = this.prince!.getCenter()
      .subtract(this.cameras.main.worldView)
      .add({ x: 1, y: -6 });
    await new Promise<void>(resolve => {
      const options: RectTransitionOptions = {
        toPosition,
        callback: resolve,
        ease: easing.sine.out,
        duration: 2000,
      };
      this.scene.launch(sceneKeys.rectTransition, options);
    });
    this.add
      .renderTexture(0, 0, this.renderer.width, this.renderer.height)
      .setOrigin(0)
      .fill(0x000000)
      .setDepth(PLAYER_DEPTH + 1)
      .setScrollFactor(0);
    this.scene.stop(sceneKeys.rectTransition);
    await this.delay(10000);
    const screenCenter = this.screenCenter;
    let textPointerWasDown = false;
    const text = this.add
      .bitmapText(0, 0, fonts.normal, "click here to continue")
      .setDepth(PLAYER_DEPTH + 2)
      .setInteractive({ useHandCursor: true })
      .on(events.object.pointer.down, () => {
        textPointerWasDown = true;
        text.setTint(colors.orange);
      })
      .on(events.object.pointer.over, () => text.setTint(colors.yellow))
      .on(events.object.pointer.out, () => {
        textPointerWasDown = false;
        text.clearTint();
      });
    text.setPosition(
      screenCenter.x - text.width / 2,
      screenCenter.y - text.height / 2
    );
    this.input.mouse!.releasePointerLock();
    await new Promise<void>(resolve => {
      text.on(events.object.pointer.up, () => {
        if (textPointerWasDown) {
          if (this.scale.isFullscreen) {
            this.input.mouse!.requestPointerLock();
          }
          resolve();
        }
      });
    });
    text.destroy();
    await this.delay(1000);
    this.nextState();
  }

  private async startClouds() {
    const rng = new phaser.Math.RandomDataGenerator(["Airport clouds"]);
    for (let i = 0; i < 5; i++) {
      const key = getImageKey("global", "cloud-" + rng.between(1, 2));
      this.physics.add
        .image(-128, rng.between(88, 192), ATLAS_KEY, key)
        .setDepth(this.airplane!.object.depth - 1)
        .setVelocityX(32)
        .body.setAllowGravity(false);
      await this.delay(rng.between(3000, 8000), true);
    }
  }

  private async startRingFlight() {
    const { key, info } = this.getSpriteSheet("ring");
    const ring = this.physics.add
      .sprite(
        this.prince!.getCenter().x - 4,
        this.prince!.getCenter().y + 1,
        key
      )
      .setSize(14, 14)
      .setOffset(1, 1)
      .setDepth(PLAYER_DEPTH);
    ring.body.setAllowGravity(false);
    createSpriteAnimations(ring, key, info);
    ring.anims.play("ring");
    this.fadeOutMusic(5900); // ring flight time + end transition
    const acceleration = new Vector();
    const accelerate = async (
      angle: number,
      force: number,
      duration: number
    ) => {
      angle *= Math.PI / 180;
      acceleration.set(Math.cos(angle), Math.sin(angle)).scale(force);
      ring.setAcceleration(acceleration.x, acceleration.y);
      await this.delay(duration, true);
      ring.setAcceleration(0, 0);
    };
    await accelerate(20, 700, 100);
    await this.delay(250, true);
    await accelerate(-85, 250, 200);
    await this.delay(250, true);
    await accelerate(90, 250, 100);
    await this.delay(250, true);
    await accelerate(-105, 250, 100);
    await this.delay(50, true);
    for (let i = 0; i < 16; i++) {
      await accelerate(225 - i * 17, 190, 100);
    }
    this.pushRealLifeRing();
    await accelerate(-45, 100, 1000);
    ring.destroy();
  }

  private async takeOff() {
    this.inputController!.deactivate();
    await this.player!.idle();
    await this.delay(1000);
    const camera = this.cameras.main;
    camera.stopFollow();
    this.inputController!.activate();
    this.inputController!.deactivate(false);
    await this.scrollCamera(
      new Vector(
        this.prince!.getCenter().x! - camera.width / 2,
        this.dimensions.height - camera.height
      ),
      2000,
      easing.quad.inOut
    );
    camera.startFollow(
      this.prince!.object,
      false,
      undefined,
      undefined,
      -this.prince!.object.width / 2,
      -this.prince!.object.height / 2
    );
    this.player!.lookLeft();
    this.prince!.object.setDepth(0.25).setVisible(true);
    await this.delay(500);
    this.prince!.runLeft();
    await this.delay(550, true);
    this.prince!.object.setDepth(1);
    this.prince!.runRight();
    await this.delay(500, true);
    this.prince!.say(this.getText("prince", "wait"));
    await this.delay(1900, true);
    this.prince!.object.setDepth(-1);
    this.prince!.runLeft();
    await this.delay(1500, true);
    this.prince!.object.setDepth(this.followMeCar!.object.depth);
    await new Promise<void>(resolve => {
      const update = () => {
        if (
          this.prince!.getCenter().x! <
          this.airplane!.object.getRightCenter().x! + 160
        ) {
          this.physics.world.off(events.world.step, update);
          resolve();
        }
      };
      this.physics.world.on(events.world.step, update);
    });
    const jumpOnPlane = async () => {
      await this.delay(1500, true);
      this.prince!.object.body.setAllowGravity(true);
      this.prince!.jump();
      await this.prince!.onFloor();
      this.prince!.idle();
      this.prince!.object.anims.play("run");
      this.prince!.object.setVelocityX(
        this.airplane!.object.body.velocity.x - 80
      );
      await this.delay(750, true);
      this.prince!.object.anims.play("idle");
      this.prince!.object.setVelocityX(this.airplane!.object.body.velocity.x);
    };
    const setAccelerationX = (value: number) => {
      this.player!.object.body.setAccelerationX(value);
      this.airplane!.object.body.setAccelerationX(value);
      this.prince!.object.body.setAccelerationX(value);
    };
    const startPlane = async () => {
      setAccelerationX(-16);
      await this.delay(1000, true);
      setAccelerationX(-32);
      await this.delay(1000, true);
      setAccelerationX(-64);
      await this.delay(3000, true);
      this.airplane!.object.body.setAccelerationY(-9);
      await this.delay(2500, true);
    };
    this.getSound("take-off").setVolume(0.25).play();
    await Promise.all([jumpOnPlane(), startPlane()]);
    for (const object of [this.airplane, this.player, this.prince]) {
      object!.object.body.setAcceleration(0).setVelocity(0);
    }
    await this.airplane!.retractLandingGear();
    this.startClouds();
    await this.propose();
    this.nextState();
  }

  private updateAirplane() {
    const acceleration = 16;
    const breakAcceleration = 48;
    const strongBreakAcceleration = 64;
    const maxSpeed = 72;
    if (
      overlaps(this.airplane!.object.getBounds(), this.startZone!.getBounds())
    ) {
      if (this.airplane!.object.body.velocity.x > -maxSpeed / 8) {
        this.airplane!.object.body.setAccelerationX(0);
        this.airplane!.object.body.velocity.x = 0;
        this.nextState();
      } else {
        this.airplane!.object.body.setAccelerationX(strongBreakAcceleration);
      }
    } else if (
      this.followMeCar!.object.x > this.airplane!.object.x - 144 &&
      this.followMeCar!.object.x < this.airplane!.object.x - 64
    ) {
      if (this.airplane!.object.body.velocity.x <= -maxSpeed) {
        this.airplane!.object.body.setAccelerationX(0);
        this.airplane!.object.body.velocity.x = -maxSpeed;
      } else {
        this.airplane!.object.body.setAccelerationX(-acceleration);
      }
    } else {
      if (this.airplane!.object.body.velocity.x > -maxSpeed / 8) {
        this.airplane!.object.body.setAccelerationX(0);
        this.airplane!.object.body.velocity.x = 0;
      } else {
        this.airplane!.object.body.setAccelerationX(breakAcceleration);
      }
    }
  }

  private createAirplaneColliderGroup() {
    const colliders = this.physics.add.staticGroup();
    const { x, y, width } = this.airplane!.object;
    const zone1 = new Zone(this, x + 1, y + 35, width - 1, 17).setOrigin(0);
    colliders.add(zone1);
    const zone2 = new Zone(this, x + 11, y + 31, width - 11, 21).setOrigin(0);
    colliders.add(zone2);
    this.physics.add.collider(this.player!.object, colliders);
  }

  private createHangingClockSecondHand({ x, y, depth }: Image) {
    const { key, info } = this.getSpriteSheet("hanging-clock-second-hand");
    const sprite = this.add
      .sprite(x, y + 57, key)
      .setOrigin(0)
      .setDepth(depth);
    createSpriteAnimations(sprite, key, info);
    const { anims } = sprite;
    anims.get("rotate").repeat = -1;
    anims.play("rotate");
  }

  protected processImageObjects(imageObjects: ImageObject[]) {
    for (const { key, image } of imageObjects) {
      switch (key) {
        case "backpack":
          this.backpack = image;
          break;
        case "building-1-reflections":
          this.buildingReflections[0] = image;
          break;
        case "building-1-windows":
          this.buildingWindows[0] = image;
          break;
        case "building-2-reflections":
          this.buildingReflections[1] = image;
          break;
        case "building-2-windows":
          this.buildingWindows[1] = image;
          break;
        case "building-3-reflections":
          this.buildingReflections[2] = image;
          break;
        case "building-3-windows":
          this.buildingWindows[2] = image;
          break;
        case "building-4-reflections":
          this.buildingReflections[3] = image;
          break;
        case "building-4-windows":
          this.buildingWindows[3] = image;
          break;
        case "business-guy":
          this.businessGuy = new Person(image)
            .setBalloonColors({ fill: colors.blue, text: colors.white })
            .setBalloonOffset(new Vector(0, -7));
          break;
        case "duty-free-saleswoman":
          this.saleswoman = new Person(image)
            .setBalloonColors({ text: colors.pink })
            .setBalloonOffset(new Vector(-2, -7))
            .setMaxCharsPerLine(24);
          break;
        case "hanging-clock":
          this.createHangingClockSecondHand(image);
          break;
        case "lost-and-found-stand":
          this.lostAndFoundStand = image;
          break;
        case "security-conveyor":
          this.securityConveyor = image;
          break;
        case "state-officer":
          this.stateOfficer = new Person(image)
            .setBalloonColors({ fill: colors.statePolice, text: colors.white })
            .setBalloonOffset(new Vector(-2, -7))
            .setMaxCharsPerLine(24);
          break;
        case "suitcase":
          this.suitcase = image;
          break;
        case "toilet-foreground":
          this.toiletForeground = image;
          break;
        case "window-reflections":
          if (image.depth !== this.windowReflectionContainer!.depth) {
            this.windowReflectionContainer!.setDepth(image.depth);
          }
          this.windowReflectionContainer!.add(image).setDepth(image.depth);
          break;
        case "wine-bottle":
          this.wineBottle = image.setVisible(false);
          break;
      }
    }
  }

  protected processNoImageObjects(noImageObjects: NoImageObject[]) {
    for (const { key, x, y, object, properties } of noImageObjects) {
      switch (key) {
        case "airplane":
          this.airplane = new Airplane(this, x, y);
          if (properties.has("depth")) {
            this.airplane.object.setDepth(properties.get("depth"));
          }
          this.airplane.object.body.setAllowGravity(false);
          break;
        case "escalator-stairs":
          this.escalators.push(
            new Escalator(
              this,
              new Vector(x, y),
              object.flippedHorizontal ? "down" : "up",
              properties.get("stair-count"),
              new Vector(
                properties.get("stair-width"),
                properties.get("stair-height")
              ),
              properties.get("stairs-per-second")
            )
          );
          break;
        case "follow-me-car":
          this.followMeCar = new FollowMeCar(this, x, y);
          if (properties.has("depth")) {
            this.followMeCar.object.setDepth(properties.get("depth"));
          }
          this.followMeCar.object.body.setAllowGravity(false);
          break;
        case "prince":
          this.prince = new AirportPrince(this, x, y);
          this.prince.object.setVisible(false).body.setAllowGravity(false);
          break;
      }
    }
  }

  protected processZoneObjects(zoneObjects: ZoneObject[]) {
    const revolvingDoorZones = this.physics.add.staticGroup();
    this.revolvingDoorZoneCollider = this.physics.add.collider(
      this.player!.object,
      revolvingDoorZones
    );
    const toiletZones = this.physics.add.staticGroup();
    this.toiletZoneCollider = this.physics.add.collider(
      this.player!.object,
      toiletZones
    );
    for (const { key, zone } of zoneObjects) {
      switch (key) {
        case "revolving-door-zone":
          revolvingDoorZones.add(zone);
          break;
        case "start-zone":
          this.startZone = zone;
          break;
        case "toilet-zone":
          toiletZones.add(zone);
          break;
        case "window-reflection-zone":
          const mask = this.make
            .graphics(undefined, false)
            .fillRect(zone.x, zone.y, zone.width, zone.height)
            .createGeometryMask();
          this.windowReflectionContainer!.setMask(mask);
          break;
      }
    }
  }

  private nextState() {
    switch (this.state) {
      case State.Inital:
        this.state = State.Exploring;
        break;
      case State.Exploring:
        this.state = State.LookingForBackpack;
        this.getAction("business-guy-comment")!.reset();
        break;
      case State.LookingForBackpack:
        this.state = State.AskingForBackpack;
        this.getAction("business-guy-comment")!.reset();
        break;
      case State.AskingForBackpack:
        this.state = State.LookingForLostAndFoundStand;
        this.getAction("business-guy-comment")!.reset();
        this.openLostAndFoundArea();
        break;
      case State.LookingForLostAndFoundStand:
        this.state = State.TakingBackpack;
        break;
      case State.TakingBackpack:
        this.state = State.FailingSecurityCheck;
        this.getAction("business-guy-comment")!.reset();
        this.getAction("request-to-put-luggage-on-conveyor")!.reset();
        break;
      case State.FailingSecurityCheck:
        this.state = State.BuyingWine;
        break;
      case State.BuyingWine:
        this.state = State.TakingWine;
        break;
      case State.TakingWine:
        this.state = State.PassingSecurityCheck;
        this.getAction("request-to-put-luggage-on-conveyor")!.reset();
        break;
      case State.PassingSecurityCheck:
        this.state = State.Taxiway;
        this.openTaxiway();
        break;
      case State.Taxiway:
        this.state = State.Runway;
        this.createAirplaneColliderGroup();
        {
          const { prince, player } = this.airplaneColliders!;
          player.active = true;
          prince.active = true;
        }
        this.exitFollowMeCar();
        break;
      case State.Runway:
        this.state = State.EndTransition;
        this.runEndTransition();
        break;
      case State.EndTransition:
        this.complete(true);
        break;
    }
  }
}
