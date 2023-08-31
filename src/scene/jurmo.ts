import { NoImageObject, Scene, ZoneObject } from "./scene";
import { createSpriteAnimations, easing, moveObjectTo } from "../helpers";

import { Alpaca } from "../sprite/alpaca";
import { AlpacaSpit } from "../sprite/alpaca-spit";
import { Collider } from "../phaser";
import { Farmer } from "../sprite/farmer";
import { JurmoPrince } from "../sprite/jurmo-prince";
import { PLAYER_DEPTH } from "../sprite/player";
import { Options as RectTransitionOptions } from "./rect-transition";
import { Vector } from "../phaser";
import phaser from "phaser";
import { sceneKeys } from "../config";

type ActionKey =
  | "alpaca-approaches"
  | "alpaca-chase-prince"
  | "alpaca-spit-on-prince"
  | "greet-alpaca"
  | "talk-to-farmer"
  | "talk-to-prince-about-alpaca"
  | "tell-prince-to-stop-running";

type StaticGroup = phaser.Physics.Arcade.StaticGroup;

const enum State {
  Initial,
  Exploring,
  AlpacaChasingPrince,
  AlpacaSpitsOnPrince,
}

export class JurmoScene extends Scene<void, ActionKey> {
  private state = State.Initial;

  private alpaca?: Alpaca;

  private alpacaStartPosition?: Vector;

  private backChaseZones?: StaticGroup;

  private backChaseZoneColliders?: { alpaca: Collider; prince: Collider };

  private chaseZones?: StaticGroup;

  private dimensions = { width: 384, height: 128 };

  private farmer?: Farmer;

  private groundZones?: StaticGroup;

  private prince?: JurmoPrince;

  private princeIsAbleToTalk = false;

  private princeStartPosition?: Vector;

  constructor() {
    super("jurmo");
  }

  public create() {
    super.create();

    this.setBounds(this.dimensions.width, this.dimensions.height);

    this.paintSky("jurmo");

    this.addPlayer(0, 38);
    this.player!.startCameraFollow();
    this.player!.putOnBackpack();

    this.createWater();

    this.processTileMap("jurmo", undefined, [
      "alpaca",
      "farmer",
      "jurmo-prince",
    ]);

    this.physics.add.collider(this.player!.object, this.groundZones!);
    this.physics.add.collider(this.alpaca!.object, this.chaseZones!);
    this.physics.add.collider(this.prince!.object, this.chaseZones!);
    this.backChaseZoneColliders = {
      alpaca: this.physics.add.collider(
        this.alpaca!.object,
        this.backChaseZones!
      ),
      prince: this.physics.add.collider(
        this.prince!.object,
        this.backChaseZones!
      ),
    };
    this.backChaseZoneColliders.alpaca.active = true;
    this.backChaseZoneColliders.prince.active = false;

    this.createActions();

    this.runStartTransition();
  }

  private async createWater() {
    const { key, info } = this.getSpriteSheet("water");
    const sprite = this.add.sprite(0, 0, key).setOrigin(0).setVisible(false);
    createSpriteAnimations(sprite, key, info);
    const { anims } = sprite;
    anims.get("move").repeat = -1;
    const tileSprite = this.add
      .tileSprite(0, 16, this.dimensions.width, 32, key)
      .setOrigin(0);
    anims.play("move");
    do {
      tileSprite.setFrame(sprite.frame.name);
      await this.nextUpdate();
    } while (this.scene.isActive());
  }

  public update(time: number, delta: number) {
    if (this.isComplete) {
      return;
    }
    super.update(time, delta);
    this.prince!.update();
    switch (this.state) {
      case State.Exploring:
        this.processActions("greet-alpaca");
        break;
      case State.AlpacaChasingPrince:
        this.processActions(
          "alpaca-approaches",
          "alpaca-chase-prince",
          "talk-to-farmer",
          "talk-to-prince-about-alpaca",
          "tell-prince-to-stop-running"
        );
        break;
      case State.AlpacaSpitsOnPrince:
        this.processActions("alpaca-spit-on-prince");
        break;
    }
    this.setObjectSoundVolumes();
  }

  private createActions() {
    this.createAction("greet-alpaca", () => this.greetAlpaca(), {
      precondition: () =>
        this.player!.object.x > this.alpaca!.object.x - 32 &&
        this.player!.object.x < this.alpaca!.object.x &&
        this.player!.looksAt(this.alpaca!.object),
      deactivateInputController: true,
      showActionHint: true,
    });
    this.createAction("alpaca-chase-prince", () => this.alpacaChasePrince(), {
      precondition: () =>
        !talkToPrinceAboutAlpacaAction.isActive &&
        !tellPrinceToStopRunning.isActive,
      autoReset: true,
    });
    const talkToPrinceAboutAlpacaAction = this.createAction(
      "talk-to-prince-about-alpaca",
      () => this.talkToPrinceAboutAlpaca(),
      {
        precondition: () =>
          this.princeIsAbleToTalk &&
          this.player!.isInRangeTo(this.prince!.object, 24),
        deactivateInputController: true,
        showActionHint: true,
      }
    );
    this.createAction(
      "alpaca-approaches",
      () => this.prince!.say(this.getText("prince", "alpaca-approaches")),
      {
        precondition: () => talkToPrinceAboutAlpacaAction.isComplete,
      }
    );
    const talkToFarmerAction = this.createAction(
      "talk-to-farmer",
      () => this.talkToFarmer(),
      {
        precondition: () =>
          talkToPrinceAboutAlpacaAction.isComplete &&
          this.player!.isInRangeTo(this.farmer!.object, 32) &&
          this.player!.looksAt(this.farmer!.object),
        deactivateInputController: true,
        showActionHint: true,
      }
    );
    const tellPrinceToStopRunning = this.createAction(
      "tell-prince-to-stop-running",
      () => this.tellPrinceToStopRunning(),
      {
        precondition: () =>
          talkToFarmerAction.isComplete &&
          this.princeIsAbleToTalk &&
          this.player!.isInRangeTo(this.prince!.object, 24),
        deactivateInputController: true,
        showActionHint: true,
      }
    );
    this.createAction("alpaca-spit-on-prince", () => this.alpacaSpitOnPrince());
  }

  private async alpacaChasePrince() {
    this.alpaca!.object.setPosition(
      this.alpacaStartPosition!.x,
      this.alpacaStartPosition!.y
    );
    this.alpaca!.bounceLeft();
    await this.delay(1350, true);
    this.prince!.object.setPosition(
      this.princeStartPosition!.x,
      this.princeStartPosition!.y
    );
    this.prince!.object.setDepth(0.75);
    this.prince!.runRight();
    await this.delay(850, true);
    this.backChaseZoneColliders!.alpaca.active = false;
    this.alpaca!.object.setDepth(0.75);
    await this.alpaca!.idle();
    this.alpaca!.bounceRight();
    await this.delay(1000, true);
    this.backChaseZoneColliders!.prince.active = true;
    this.prince!.object.setDepth(0.25);
    this.prince!.runLeft();
    await this.delay(1250, true);
    await this.alpaca!.idle();
    await this.delay(525, true);
    this.prince!.idle();
    this.prince!.lookRight();
    await this.delay(450, true);
    this.alpaca!.lookLeft();
    await this.delay(500, true);
    this.backChaseZoneColliders!.alpaca.active = true;
    this.alpaca!.object.setDepth(0.25);
    this.alpaca!.bounceLeft();
    await this.delay(250, true);
    await this.alpaca!.idle();
    this.backChaseZoneColliders!.prince.active = false;
    this.prince!.object.setDepth(0.75);
    this.prince!.runRight();
    await this.delay(500, true);
    this.prince!.idle();
    await this.delay(500, true);
    this.alpaca!.bounceLeft();
    await this.delay(500, true);
    this.prince!.runRight();
    await this.delay(250, true);
    await this.alpaca!.idle();
    await this.delay(250, true);
    this.alpaca!.bounceRight();
    await this.delay(400, true);
    this.prince!.runLeft();
    await this.delay(250, true);
    await this.alpaca!.idle();
    this.backChaseZoneColliders!.alpaca.active = false;
    this.alpaca!.object.setDepth(0.75);
    this.alpaca!.bounceLeft();
    await this.delay(1000, true);
    this.backChaseZoneColliders!.prince.active = true;
    this.prince!.object.setDepth(0.25);
    this.prince!.runRight();
    await this.delay(500, true);
    await this.alpaca!.idle();
    this.backChaseZoneColliders!.alpaca.active = true;
    this.alpaca!.object.setDepth(0.25);
    this.alpaca!.bounceRight();
    await this.delay(900, true);
    this.backChaseZoneColliders!.prince.active = false;
    this.prince!.object.setDepth(0.75);
    this.prince!.runLeft();
    await this.delay(1100, true);
    await this.alpaca!.idle();
    await this.delay(475, true);
    await this.prince!.idle();
    this.prince!.lookRight();
    this.princeIsAbleToTalk = true;
    await this.delay(3000);
    this.princeIsAbleToTalk = false;
  }

  private async alpacaSpitOnPrince() {
    this.alpaca!.bounceLeft();
    await this.delay(1600, true);
    await this.alpaca!.idle();
    await this.delay(1000);
    const spit = new AlpacaSpit(
      this,
      this.alpaca!.object.x + 1,
      this.alpaca!.object.y + 7
    );
    spit.object.setDepth(PLAYER_DEPTH + 1).body.setAllowGravity(false);
    const targetPosition = this.prince!.object.getTopCenter() as Vector;
    targetPosition.x += 2;
    targetPosition.y += 8;
    await moveObjectTo(spit.object, targetPosition, 64);
    await spit.splash();
    await this.delay(500);
    await this.prince!.say(this.getText("prince", "disgusting"));
    await this.delay(1000);
    await this.player!.say(this.getText("player", "laugh-at-prince"));
    await this.delay(1000);
    this.nextState();
  }

  private async greetAlpaca() {
    await this.player!.say(this.getText("alpaca", "greet"));
    await this.delay(500);
    this.nextState();
    await this.delay(750);
    this.player!.lookLeft();
    this.inputController!.activate();
    await this.delay(2000);
    await this.player!.say(this.getText("player", "oops"));
  }

  private async runStartTransition() {
    const fromPosition = this.player!.getCenter()
      .subtract(this.cameras.main.worldView)
      .add({ x: 0, y: -3 });
    await new Promise<void>(resolve => {
      const options: RectTransitionOptions = {
        fromPosition,
        fromDimensions: new Vector(),
        toPosition: new Vector(
          this.renderer.width / 2,
          this.renderer.height / 2
        ),
        toDimensions: new Vector(this.renderer.width, this.renderer.height),
        callback: resolve,
        ease: easing.sine.out,
      };
      this.scene.launch(sceneKeys.rectTransition, options);
    });
    this.scene.stop(sceneKeys.rectTransition);
    this.nextState();
  }

  private setObjectSoundVolumes() {
    const camera = this.cameras.main;
    const rightScreenEdge = camera.worldView.x + camera.width;
    const distanceThreshold = 128;
    {
      const distance = this.alpaca!.object.getCenter().x! - rightScreenEdge;
      const volume = Math.min(1 - distance / distanceThreshold, 1);
      this.alpaca!.jumpSoundVolume = volume / 16;
    }
    {
      const distance = this.prince!.object.getCenter().x! - rightScreenEdge;
      const volume = Math.min(1 - distance / distanceThreshold, 1);
      this.prince!.runSoundVolume = (volume * 3) / 16;
    }
  }

  private async talkToFarmer() {
    for (const [person, text, action] of this.getText(
      "farmer",
      "conversation"
    )) {
      if (person === 1) {
        await this.player!.say(text);
      } else {
        switch (action) {
          case "idle":
            this.farmer!.idle();
            await this.delay(500);
            break;
          case "watch":
            await this.delay(500);
            this.farmer!.watch();
            break;
          default:
            await this.farmer!.say(text);
            break;
        }
      }
      await this.delay(500);
    }
  }

  private async talkToPrinceAboutAlpaca() {
    if (this.player!.object.x > this.prince!.object.x - 12) {
      await this.player!.walkTo(this.prince!.object.x - 8);
    }
    if (this.player!.looksLeft) {
      this.player!.lookRight();
      await this.delay(500);
    }
    const conversation = this.getText("prince", "alpaca-conversation");
    for (const [person, text, action] of conversation) {
      if (person === 1) {
        await this.player!.say(text);
      } else {
        switch (action) {
          case "turn-to-alpaca":
            this.prince!.lookRight();
            await this.delay(500);
            break;
          case "turn-to-player":
            this.prince!.lookLeft();
            break;
          default:
            await this.prince!.say(text);
            break;
        }
      }
      await this.delay(500);
    }
  }

  private async tellPrinceToStopRunning() {
    if (this.player!.object.x > this.prince!.object.x - 12) {
      await this.player!.walkTo(this.prince!.object.x - 8);
    }
    if (this.player!.looksLeft) {
      this.player!.lookRight();
      await this.delay(500);
    }
    const conversation = this.getText("prince", "alpaca-tip");
    for (const [person, text] of conversation) {
      if (person === 1) {
        await this.player!.say(text);
      } else {
        await this.prince!.say(text);
      }
      await this.delay(500);
    }
    this.nextState();
  }

  protected processNoImageObjects(noImageObjects: NoImageObject[]) {
    for (const { key, x, y } of noImageObjects) {
      switch (key) {
        case "alpaca":
          this.alpaca = new Alpaca(this, x, y);
          this.alpacaStartPosition = new Vector(x, y);
          break;
        case "farmer":
          this.farmer = new Farmer(this, x, y);
          this.farmer.object.setDepth(PLAYER_DEPTH + 1).setVisible(false);
          break;
        case "jurmo-prince":
          this.prince = new JurmoPrince(this, x, y);
          this.princeStartPosition = new Vector(x, y);
          break;
      }
    }
  }

  protected processZoneObjects(zoneObjects: ZoneObject[]) {
    this.backChaseZones = this.physics.add.staticGroup();
    this.chaseZones = this.physics.add.staticGroup();
    this.groundZones = this.physics.add.staticGroup();
    for (const { key, zone } of zoneObjects) {
      switch (key) {
        case "back-chase-zone":
          this.backChaseZones.add(zone);
          break;
        case "chase-zone":
          this.chaseZones.add(zone);
          break;
        case "ground-zone":
          this.groundZones.add(zone);
          break;
      }
    }
  }

  private nextState() {
    switch (this.state) {
      case State.Initial:
        this.state = State.Exploring;
        break;
      case State.Exploring:
        this.state = State.AlpacaChasingPrince;
        this.farmer!.object.setVisible(true);
        break;
      case State.AlpacaChasingPrince:
        this.state = State.AlpacaSpitsOnPrince;
        break;
      case State.AlpacaSpitsOnPrince:
        this.complete();
        break;
    }
  }
}
