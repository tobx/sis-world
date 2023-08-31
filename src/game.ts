import { events, setDelayFactor } from "./helpers.js";

import { AirportScene } from "./scene/airport.js";
import { AtacamaScene } from "./scene/atacama.js";
import { BootScene } from "./scene/boot.js";
import { CreditsScene } from "./scene/credits.js";
import { EndingScene } from "./scene/ending.js";
import { EventEmitter } from "./phaser.js";
import { FifthFloorScene } from "./scene/fifth-floor.js";
import { HomeScene } from "./scene/home.js";
import { JurmoScene } from "./scene/jurmo.js";
import { LevelScene } from "./scene/level.js";
import { LobbyScene } from "./scene/lobby.js";
import { LogosScene } from "./scene/logos.js";
import { NotificationScene } from "./scene/notification.js";
import { PauseScene } from "./scene/pause.js";
import { PrefaceScene } from "./scene/preface.js";
import { RectTransitionScene } from "./scene/rect-transition.js";
import { SceneManager } from "./scene/manager.js";
import { ServoController } from "./servo-controller.js";
import { SignScene } from "./scene/sign.js";
import { TitleScene } from "./scene/title.js";
import { TutorialScene } from "./scene/tutorial.js";
import { game as config } from "./config.js";
import { log } from "./utilities.js";
import phaser from "phaser";
import { setLocale } from "./text.js";
import spriteSheetInfoMap from "./sprite/config.json";

export type Environment = "production" | "development";

export type GameConfig = typeof config;

type PhaserGameConfig = phaser.Types.Core.GameConfig;

export const environment = config.environment;

export const registryKeys = {
  appInfo: "app-info",
  assetDirectories: "asset-directories",
  bootConfig: "boot-config",
  eventCenter: "event-center",
  gamepadActionMapping: "gamepad-action-mapping",
  languageFile: "language-file",
  fullscreenPointerLock: "fullscreen-pointer-lock",
  sceneManager: "scene-manager",
  servoController: "servo-controller",
  spriteSheetInfoMap: "sprite-sheet-info",
};

export class Game extends phaser.Game {
  private servoController;

  constructor(parent: HTMLElement) {
    super(createGameConfig(parent));
    if (config.servoController !== undefined) {
      this.servoController = new ServoController(config.servoController);
    }
    setDelayFactor(config.time.delayFactor);
    setLocale(config.locale);
    const sceneManager = new SceneManager(
      config.scene.order,
      config.scene.startKey,
      config.scene.showLevelScene
    );
    for (const [key, data] of [
      [registryKeys.appInfo, config.app],
      [
        registryKeys.assetDirectories,
        {
          atlases: config.assets.atlases,
          fonts: config.assets.fonts,
          images: config.assets.images,
          music: config.assets.music,
          sounds: config.assets.sounds,
          sprites: config.assets.sprites,
          tilemaps: config.assets.tilemaps,
          tilesets: config.assets.tilesets,
        },
      ],
      [
        registryKeys.bootConfig,
        {
          disableStartClick: config.disableStartClick,
        },
      ],
      [registryKeys.eventCenter, new EventEmitter()],
      [registryKeys.fullscreenPointerLock, true],
      [registryKeys.gamepadActionMapping, config.gamepad.actionMapping],
      [
        registryKeys.languageFile,
        `${config.assets.lang}/${config.language}.json`,
      ],
      [registryKeys.servoController, this.servoController],
      [registryKeys.sceneManager, sceneManager],
      [registryKeys.spriteSheetInfoMap, spriteSheetInfoMap],
    ]) {
      this.registry.set(key, data);
    }
    this.sound.mute = config.audio.mute;
    this.sound.pauseOnBlur = false;
    this.events.on(events.core.pause, () => this.sound.pauseAll());
    this.events.on(events.core.resume, () => this.sound.resumeAll());
    this.resetRingServo();
    this.canvas.addEventListener("click", () => {
      if (
        this.scale.isFullscreen &&
        this.registry.get(registryKeys.fullscreenPointerLock)
      ) {
        this.input.mouse!.requestPointerLock();
      }
    });
    this.scale.on(events.scale.enterFullscreen, () => {
      if (this.registry.get(registryKeys.fullscreenPointerLock)) {
        this.input.mouse!.requestPointerLock();
      }
    });
  }

  private async resetRingServo() {
    if (this.servoController !== undefined) {
      try {
        await this.servoController.moveRingServo("reset");
      } catch (error) {
        log.error("Cannot reach servo controller.");
      }
    }
  }
}

function createGameConfig(parent: HTMLElement): PhaserGameConfig {
  return {
    width: config.screen.width,
    height: config.screen.height,
    parent,
    title: config.app.title,
    url: config.app.url,
    version: config.app.version,
    input: {
      activePointers: 3,
      gamepad: true,
    },
    banner: {
      hidePhaser: config.banner.hidePhaser,
    },
    physics: {
      default: "arcade",
      arcade: {
        debug: config.debug,
        gravity: { y: config.physics.gravity },
        tileBias: 4,
      },
    },
    pixelArt: true,
    scale: {
      mode: phaser.Scale.WIDTH_CONTROLS_HEIGHT,
      autoCenter: phaser.Scale.CENTER_BOTH,
    },
    scene: [
      // keep this on top of the list
      BootScene,

      AirportScene,
      AtacamaScene,
      CreditsScene,
      EndingScene,
      FifthFloorScene,
      HomeScene,
      JurmoScene,
      LevelScene,
      LobbyScene,
      LogosScene,
      NotificationScene,
      PauseScene,
      PrefaceScene,
      RectTransitionScene,
      SignScene,
      TitleScene,
      TutorialScene,
    ],
  };
}
