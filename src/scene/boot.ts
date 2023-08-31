import { ATLAS_KEY, SceneKey, colors, fonts } from "../config";
import { GameConfig, registryKeys } from "../game";
import { Graphics, Vector } from "../phaser";
import { events, getSpriteSheetKey, getTilesetKey } from "../helpers";

import { Dimensions } from "../math";
import { Scene } from "./scene";
import { checkWebpLosslessSupport } from "../utilities";
import phaser from "phaser";

export type ImageBase = "icons" | "global" | SceneKey;

export type TilesetName = (typeof tilesetNames)[number];

type SpriteSheetTag = {
  name: string;
  from: number;
  to: number;
};

export type SpriteSheetInfo = {
  frame: Dimensions;
  durations: number[];
  tags: SpriteSheetTag[];
};

export type SpriteSheetInfoMap = {
  [key in ImageBase]?: { [name: string]: SpriteSheetInfo };
};

export type MusicKey = (typeof musicKeys)[number];

export type SoundKey = (typeof soundKeys)[number];

const musicKeys = ["theme", "win"] as const;

const soundKeys = [
  "action",
  "alpaca-jump",
  "camera-shutter",
  "car-door-close",
  "car-door-open",
  "car-engine",
  "car-engine-start",
  "car-window",
  "coffee-machine",
  "fireworks",
  "jump",
  "maus-ag",
  "pause",
  "resume",
  "siren",
  "step-1",
  "step-2",
  "step-3",
  "step-4",
  "take-off",
  "take",
  "ts-games",
  "typing",
  "wreck",
] as const;

const tilemapNames = [
  "airport",
  "atacama",
  "fifth-floor",
  "jurmo",
  "lobby",
  "tutorial",
];

const tilesetNames = ["airport", "fifth-floor", "forest", "lobby"] as const;

type Config = {
  disableStartClick: boolean;
};

export class BootScene extends Scene<void, void> {
  private config?: Config;

  private progressBar?: Graphics;

  private progressBarBorder?: Graphics;

  constructor() {
    super("boot", false);
  }

  public async preload() {
    const loadStartTime = this.time.now;

    this.config = this.registry.get(registryKeys.bootConfig);

    const assetDirectories = this.registry.get(
      registryKeys.assetDirectories
    ) as GameConfig["assets"];

    const imageExtension = (await checkWebpLosslessSupport()) ? "webp" : "png";

    // load texture atlas
    {
      const basePath = `${assetDirectories.atlases}/${ATLAS_KEY}`;
      this.load.atlas(
        ATLAS_KEY,
        `${basePath}.${imageExtension}`,
        `${basePath}.json`
      );
    }

    // load fonts
    for (const name of Object.values(fonts)) {
      const key = `fonts/${name}`;
      this.load.xml(key, `${assetDirectories.fonts}/${name}.xml`);
    }

    // load tilemaps
    for (const name of tilemapNames) {
      this.load.tilemapTiledJSON(
        name,
        `${assetDirectories.tilemaps}/${name}.tmj`
      );
    }

    // load tilesets
    for (const name of tilesetNames) {
      const path = `${assetDirectories.tilesets}/${name}.${imageExtension}`;
      this.load.image(getTilesetKey(name), path);
    }

    // load music
    for (const name of musicKeys) {
      const path = `${assetDirectories.music}/${name}.m4a`;
      this.load.audio(name, [path]);
    }

    // load sounds
    for (const name of soundKeys) {
      const path = `${assetDirectories.sounds}/${name}.m4a`;
      this.load.audio(name, [path]);
    }

    // load texts
    this.load.json("texts", this.registry.get(registryKeys.languageFile));

    this.createProgressBar(100, 6, colors.green, 1, 2, colors.white);

    this.load
      .on(events.load.complete, () => {
        this.handleLoadingCompletedEvent(loadStartTime);
      })
      .start();
  }

  private addSpriteSheets() {
    for (const [base, infos] of Object.entries(
      this.registry.get(registryKeys.spriteSheetInfoMap)
    ) as [ImageBase, { [name: string]: SpriteSheetInfo }][]) {
      for (const [name, info] of Object.entries(infos)) {
        const key = getSpriteSheetKey(base, name);
        this.textures.addSpriteSheetFromAtlas(key, {
          atlas: ATLAS_KEY,
          frame: key,
          frameWidth: info.frame.width,
          frameHeight: info.frame.height,
        });
      }
    }
  }

  private createProgressBar(
    width: number,
    height: number,
    color: number,
    borderWidth: number,
    borderRadius: number,
    borderColor: number
  ) {
    const screenCenter = this.screenCenter;
    const dimensions = new Vector(width, height);
    const position = screenCenter.clone();
    position.x -= Math.ceil(dimensions.x / 2);
    position.y -= Math.ceil(dimensions.y / 2);
    const borderWidths = new Vector(borderWidth, borderWidth);
    const borderDimensions = borderWidths.clone().scale(2).add(dimensions);
    const borderPosition = position.clone().subtract(borderWidths);
    this.progressBarBorder = this.add
      .graphics()
      .fillStyle(borderColor)
      .fillRoundedRect(
        borderPosition.x,
        borderPosition.y,
        borderDimensions.x,
        borderDimensions.y,
        borderRadius + borderWidth
      );
    this.progressBar = this.add.graphics();
    this.load.on(events.load.progress, (ratio: number) => {
      this.progressBar!.clear();
      let width = Math.round(ratio * dimensions.x);
      if (width > 2) {
        this.progressBar!.fillStyle(color);
        this.progressBar!.fillRoundedRect(
          position.x,
          position.y,
          width,
          dimensions.y,
          borderRadius
        );
      }
    });
  }

  private async handleLoadingCompletedEvent(loadStartTime: number) {
    this.addSpriteSheets();
    this.parseFonts();
    const minDisplayDuration = 750;
    const minDisplay100percentDuration = 50;
    await this.delay(
      Math.max(
        minDisplay100percentDuration,
        minDisplayDuration - (this.time.now - loadStartTime)
      )
    );
    this.progressBar!.destroy();
    this.progressBarBorder!.destroy();
    if (!this.config!.disableStartClick) {
      await this.userStartClick();
    }
    await this.startFirmware();
    this.complete();
  }

  private async startFirmware() {
    await this.delay(1000);
    const writeLine = (line: number, text: string, color: number) =>
      this.add.bitmapText(16, 8 + 8 * line, fonts.normal, text).setTint(color);
    const lines = [
      writeLine(1, "Maus-80 Systems", colors.orange),
      writeLine(2, "Version 25.8.2023 (515W0R1D)", colors.yellow),
      writeLine(3, "Copyright Maus AG 1987", colors.green),
    ];
    await this.delay(1500);
    lines.push(writeLine(5, "CPU at 66MHz", colors.white));
    await this.delay(1000);
    lines.push(writeLine(6, "Memory Test:", colors.white));
    const memoryText = writeLine(6, "OK", colors.white);
    memoryText.setX(memoryText.x + 102).setOrigin(1, 0);
    await this.delay(1000);
    for (let i = 0; i <= 0x4000; i += 0x80) {
      memoryText.setText(i.toString() + "K OK");
      await this.nextUpdate();
    }
    lines.push(memoryText);
    await this.delay(1000);
    const loadingText = writeLine(8, "loading time machine", colors.gray);
    for (let i = 0; i < 3; i++) {
      await this.delay(1000);
      loadingText.setText(loadingText.text + ".");
    }
    lines.push(loadingText);
    await this.delay(1000);
    for (const line of lines) {
      line.destroy();
    }
    await this.delay(1500);
  }

  private parseFonts() {
    for (const name of Object.values(fonts)) {
      const key = `fonts/${name}`;
      phaser.GameObjects.BitmapText.ParseFromAtlas(
        this,
        name,
        ATLAS_KEY,
        key,
        key
      );
    }
  }

  private async userStartClick() {
    let wasDown = false;
    const text = this.add
      .bitmapText(0, 0, fonts.normal, "click here to start")
      .setInteractive({ useHandCursor: true })
      .on(events.object.pointer.over, () => {
        text.setTint(colors.yellow);
      })
      .on(events.object.pointer.out, () => {
        wasDown = false;
        text.clearTint();
      })
      .on(events.object.pointer.down, () => {
        wasDown = true;
        text.setTint(colors.orange);
      });
    text.setPosition(
      this.screenCenter.x - text.width / 2,
      this.screenCenter.y - text.height / 2
    );
    this.registry.set(registryKeys.fullscreenPointerLock, false);
    this.input.mouse!.releasePointerLock();
    await new Promise<void>(resolve => {
      text.on(events.object.pointer.up, () => {
        if (wasDown) {
          this.registry.set(registryKeys.fullscreenPointerLock, true);
          if (this.scale.isFullscreen) {
            this.input.mouse!.requestPointerLock();
          }
          text.destroy();
          resolve();
        }
      });
    });
  }
}
