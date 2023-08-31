import { RenderTexture, Vector, Zone } from "../phaser";

import { ATLAS_KEY } from "../config";
import { Ema } from "../math";
import { Rabbit } from "../sprite/rabbit";
import { Scene } from "./scene";
import { events } from "../helpers";
import phaser from "phaser";

type ActionKey = "pick-up-rabbit";

const MAX_PLAYER_MOVEMENT_EMA = 0.4;

let failedAttemptCount = 0;

const enum State {
  Initial,
  RabbitIsAwake,
  RabbitRunsAway,
  RabbitIsGone,
  RabbitIsSafe,
}

export class HomeScene extends Scene<void, ActionKey> {
  private state = State.Initial;

  private lastPlayerPosition = new Vector(0);

  private playerMovementEma?: Ema;

  private soundLevelMeter?: RenderTexture;

  private rabbit?: Rabbit;

  constructor() {
    super("home");
  }

  public create() {
    super.create();

    this.state = State.Initial;

    this.paintSky("normal", -44);

    this.addPlayer(-1, 47);
    this.player!.putOnBackpack();
    this.playerMovementEma = new Ema(0.1, 0);
    this.lastPlayerPosition.copy(this.player!.getCenter());

    this.add
      .image(0, 11, ATLAS_KEY, this.getImageKey("background"))
      .setOrigin(0);

    const platforms = this.physics.add.staticGroup();
    platforms.add(new Zone(this, 0, 79, 192, 10).setOrigin(0));

    this.rabbit = new Rabbit(this, 181, 72);
    this.rabbit.sleep();

    this.physics.add.collider(this.player!.object, platforms);
    this.physics.add.collider(this.rabbit.object, platforms);

    this.physics.world.on(events.world.step, () => {
      const playerMoveDistance = this.lastPlayerPosition.distance(
        this.player!.getCenter()
      );
      this.playerMovementEma!.update(playerMoveDistance);
      this.lastPlayerPosition.copy(this.player!.getCenter());
    });

    if (failedAttemptCount > 4) {
      this.inputController!.deactivate(false);
      (async () => {
        await this.nextUpdate();
        await this.notify(this.getText("sound-level-meter-note"));
        this.createSoundLevelMeter();
        this.inputController!.activate();
      })();
    }

    this.createActions();
  }

  private createSoundLevelMeter() {
    this.add
      .image(
        2,
        this.renderer.height - 2,
        ATLAS_KEY,
        this.getImageKey("sound-level-meter")
      )
      .setOrigin(0, 1);
    this.soundLevelMeter = this.add
      .renderTexture(3, this.renderer.height - 18, 2, 15)
      .setOrigin(0)
      .fill(0x000000)
      .setAlpha(2 / 3);
  }

  public update(time: number, delta: number) {
    if (this.isComplete) {
      return;
    }
    super.update(time, delta);
    if (this.soundLevelMeter !== undefined) {
      this.updateSoundLevelMeter();
    }
    switch (this.state) {
      case State.Initial:
        this.handleInitialState();
        break;
      case State.RabbitIsAwake:
        this.handleRabbitIsAwakeState();
        break;
      case State.RabbitRunsAway:
        this.handleRabbitRunsAwayState();
        break;
    }
  }

  private updateSoundLevelMeter() {
    const ratio = Math.min(
      (this.playerMovementEma!.value < 1 / 32
        ? 0
        : this.playerMovementEma!.value) / MAX_PLAYER_MOVEMENT_EMA,
      1
    );
    const scale = 1 - Math.ceil(5 * ratio) / 5;
    this.soundLevelMeter!.setScale(1, scale);
  }

  private createActions() {
    this.createAction("pick-up-rabbit", () => this.pickUpRabbit(), {
      precondition: () =>
        this.distanceBetweenRabbitAndPlayer < 8 &&
        this.player!.looksAt(this.rabbit!.object),
      executeBefore: () => {
        this.state = State.RabbitIsSafe;
      },
      deactivateInputController: true,
      showActionHint: true,
      showLock: false,
    });
  }

  private get distanceBetweenRabbitAndPlayer() {
    return Math.abs(this.rabbit!.getCenter().x - this.player!.getCenter().x);
  }

  private async handleInitialState() {
    if (this.playerMovementEma!.value > MAX_PLAYER_MOVEMENT_EMA) {
      this.state = State.RabbitIsAwake;
      this.player!.cancelActionHint();
      await this.rabbit!.wakeUp();
      await this.delay(250);
      this.player!.say(this.getText("rabbit", "call"));
    } else {
      this.processActions("pick-up-rabbit");
    }
  }

  private async handleRabbitIsAwakeState() {
    if (this.distanceBetweenRabbitAndPlayer < 24) {
      this.nextState();
      this.rabbit!.runRight();
    }
  }

  private async handleRabbitRunsAwayState() {
    if (
      !phaser.Geom.Rectangle.Overlaps(
        this.physics.world.bounds,
        this.rabbit!.object.getBounds()
      )
    ) {
      this.nextState();
      this.inputController!.deactivate(false);
      await this.player!.idle();
      await this.notify(this.getText("rabbit", "escaped"));
      failedAttemptCount++;
      this.restart();
    }
  }

  private async pickUpRabbit() {
    await this.player!.take("rabbit", () => {
      this.rabbit!.remove();
      this.rabbit = undefined;
    });
    await this.delay(500);
    await this.notify(this.getText("rabbit", "caught"));
    await this.delay(500);
    failedAttemptCount = 0;
    this.complete();
  }

  private nextState() {
    switch (this.state) {
      case State.RabbitIsAwake:
        this.state = State.RabbitRunsAway;
        break;
      case State.RabbitRunsAway:
        this.state = State.RabbitIsGone;
        break;
      case State.RabbitIsSafe:
        this.complete();
        break;
    }
  }
}
