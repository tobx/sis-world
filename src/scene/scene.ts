import { ATLAS_KEY, SceneKey, sceneKeys, themeMarkers } from "../config";
import { Balloon, ColorOptions } from "../sprite/balloon";
import { Controls, PlayerInputController, createGameControls } from "../input";
import {
  EventEmitter,
  GameObject,
  GetBounds,
  Image,
  Scene as PhaserScene,
  SoundConfig,
  TiledObject,
  TiledProperties,
  Tilemap,
  WebAudioSound,
  Zone,
} from "../phaser";
import { ImageBase, MusicKey, SoundKey, TilesetName } from "./boot";
import { MultilineText, defaultTextDuration } from "../text";
import { PLAYER_DEPTH, Player } from "../sprite/player";
import { SceneConfig, SceneManager } from "./manager";
import {
  TimedInterpolator,
  delay,
  events,
  fadeOutMusic,
  getAllTiledProperties,
  getImageKey,
  getMusic,
  getSound,
  getSpriteSheet,
  getTiledProperties,
  getTilesetKey,
  nextUpdate,
  nextWorldStep,
} from "../helpers";

import { Action } from "../action";
import { Options as LevelSceneOptions } from "./level";
import { Note } from "./notification";
import { Options as RectTransitionOptions } from "./rect-transition";
import { Vector } from "../phaser";
import { easing } from "../helpers";
import phaser from "phaser";
import { registryKeys } from "../game";

type ActionOptions = {
  autoReset?: boolean;
  deactivateInputController?: boolean;
  executeBefore?: () => void;
  precondition?: () => boolean;
  reactivateInputController?: boolean;
  resetCondition?: () => boolean;
  showActionHint?: boolean;
  showLock?: boolean;
};

export type ImageObject = {
  name: string;
  key: string;
  image: Image;
  properties: TiledProperties;
};

export type NoImageObject = {
  name: string;
  key: string;
  x: number;
  y: number;
  object: TiledObject;
  properties: TiledProperties;
};

type Tileset = phaser.Tilemaps.Tileset;

type Transform = phaser.GameObjects.Components.Transform;

export type ZoneObject = {
  name: string;
  key: string;
  zone: Zone;
};

export const notificationEvents = {
  complete: "notification-complete",
  notification: "notification",
};

export abstract class Scene<O, A> extends PhaserScene {
  private _isComplete = false;

  private readyAction?: Action;

  private actions = new Map<A, { action: Action; options: ActionOptions }>();

  protected controls?: Controls;

  protected inputController?: PlayerInputController;

  private pausedSceneKeys: SceneKey[] = [];

  protected player?: Player;

  constructor(key: SceneKey, private isPausable = true) {
    super(key);
  }

  public create(_options: O) {
    this.actions.clear();
    this.readyAction = undefined;
  }

  public update(_time: number, _delta: number) {
    this.inputController?.update();
    this.player?.update();
  }

  protected get eventCenter(): EventEmitter {
    return this.registry.get(registryKeys.eventCenter);
  }

  public get hasConnectedGamepads() {
    return this.input.gamepad!.getAll().length > 0;
  }

  protected get isComplete() {
    return this._isComplete;
  }

  protected get screenCenter() {
    const camera = this.cameras.main;
    return new Vector(
      Math.floor(camera.worldView.x + camera.width / 2),
      Math.floor(camera.worldView.y + camera.height / 2)
    );
  }

  protected createAction(
    key: A,
    func: (action: Action) => void | Promise<void>,
    options: ActionOptions = {}
  ) {
    const action = new Action(func);
    this.actions.set(key, { action, options });
    return action;
  }

  protected addControls() {
    this.controls = createGameControls(this.input);
    if (this.isPausable) {
      this.controls!.start.on("down", () => this.pause());
    }
  }

  protected addPlayer(x: number, y: number, withBoots = true) {
    this.addControls();
    this.player = new Player(this, x, y, withBoots);
    this.player.object.setDepth(PLAYER_DEPTH);
    this.inputController = new PlayerInputController(
      this.player,
      this.controls!
    );
  }

  protected async addTween(
    config:
      | phaser.Types.Tweens.TweenBuilderConfig
      | phaser.Types.Tweens.TweenChainBuilderConfig
      | phaser.Tweens.Tween
      | phaser.Tweens.TweenChain
  ) {
    return new Promise(resolve => {
      this.tweens.add(config).on(events.tween.complete, resolve);
    });
  }

  protected async complete(omitPlayerTransition = false) {
    this._isComplete = true;
    this.start("next", omitPlayerTransition);
  }

  private createTiledLayer(
    map: Tilemap,
    tileset: Tileset,
    layerId: string,
    worldHeight: number
  ) {
    const layer = map.createLayer(
      layerId,
      tileset,
      0,
      worldHeight - map.heightInPixels
    )!;
    const [collide, depth, parallaxFactorX, parallaxFactorY] =
      getTiledProperties(
        map.getLayer(layerId)!,
        "collide",
        "depth",
        "parallax-factor-x",
        "parallax-factor-y"
      );
    if (collide === true) {
      layer.setCollisionByExclusion([-1], true);
    }
    if (depth !== undefined) {
      layer.setDepth(depth);
    }
    if (parallaxFactorX !== undefined || parallaxFactorY !== undefined) {
      layer.setScrollFactor(parallaxFactorX ?? 1, parallaxFactorY ?? 1);
    }
    return layer;
  }

  protected async delay(duration: number, gameTime = false) {
    await delay(this, duration, gameTime);
  }

  protected async fadeOutMusic(duration: number) {
    const music = this.getPlayingMusic();
    if (music !== null) {
      await fadeOutMusic(this, music, duration);
    }
  }

  protected getAction(key: A) {
    return this.actions.get(key)?.action;
  }

  protected getPlayingMusic() {
    for (const music of this.sound.getAllPlaying()) {
      switch (music.key as MusicKey) {
        case "theme":
          return music as WebAudioSound;
      }
    }
    return null;
  }

  private loadText(...ids: string[]) {
    let text = this.cache.json.get("texts");
    for (const id of ids) {
      if (id in text) {
        text = text[id];
      } else {
        throw new Error(`invalid language file id: '${ids.join(".")}'`);
      }
    }
    return text;
  }

  protected getGlobalText(...ids: string[]) {
    return this.loadText("global", ...ids);
  }

  protected getText(...ids: string[]) {
    return this.loadText(this.scene.key, ...ids);
  }

  public getImageKey(name: string) {
    return getImageKey(this.scene.key as SceneKey, name);
  }

  public getSpriteSheet(
    name: string,
    base: ImageBase = this.scene.key as ImageBase
  ) {
    return getSpriteSheet(this.registry, base, name);
  }

  protected getLocalCoordinates(object: Transform & GetBounds) {
    return (object.getCenter() as Vector).subtract(
      new Vector(this.cameras.main.scrollX, this.cameras.main.scrollY)
    );
  }

  protected getMusic(key: MusicKey, config?: SoundConfig) {
    return getMusic(this, key, config);
  }

  protected getSound(key: SoundKey, config?: SoundConfig) {
    return getSound(this, key, config);
  }

  protected getIntroMusic() {
    const sound = this.getMusic("theme");
    sound.addMarker({
      name: themeMarkers.intro,
      duration: 6,
      config: { volume: 0.75 },
    });
    return sound;
  }

  protected getThemeMusic() {
    const sound = this.getMusic("theme");
    sound.addMarker({
      name: themeMarkers.loop,
      start: 8,
      duration: 64,
      config: { volume: 0.75, loop: true },
    });
    sound.addMarker({
      name: themeMarkers.ending,
      start: 76,
      duration: 64,
      config: { volume: 0.75 },
    });
    return sound;
  }

  protected async nextUpdate() {
    return nextUpdate(this);
  }

  protected async nextWorldStep() {
    return nextWorldStep(this);
  }

  protected async notify(text: MultilineText, duration?: number) {
    const note: Note = { text, duration };
    this.eventCenter.emit(notificationEvents.notification, note);
    return new Promise<void>(resolve => {
      this.eventCenter.on(notificationEvents.complete, (completed: Note) => {
        if (completed === note) {
          resolve();
        }
      });
    });
  }

  protected paintSky(name: string, offset: number = 0) {
    this.add
      .tileSprite(
        0,
        this.renderer.height - 128 + offset,
        this.renderer.width,
        128,
        ATLAS_KEY,
        getImageKey("global", "sky-" + name)
      )
      .setOrigin(0)
      .setDepth(-Infinity)
      .setScrollFactor(0);
  }

  protected processActions(...keys: A[]) {
    for (const { action, options } of keys.map(key => this.actions.get(key)!)) {
      if (
        action.isComplete &&
        (options.autoReset || options.resetCondition?.())
      ) {
        action.reset();
      }
      if (action === this.readyAction || this.readyAction === undefined) {
        this.processAction(action, options);
      }
    }
  }

  private processAction(action: Action, options: ActionOptions) {
    if (action.isReady() && (options.precondition?.() ?? true)) {
      this.readyAction = action;
      if (options.showActionHint) {
        this.player!.showActionHint();
      }
      if (!options.showActionHint || this.controls!.action.isDown) {
        this.executeAction(action, options);
      }
    } else if (this.readyAction !== undefined) {
      this.readyAction = undefined;
      if (options.showActionHint) {
        this.player!.cancelActionHint();
      }
    }
  }

  private async executeAction(action: Action, options: ActionOptions) {
    const readyPromises: Promise<void>[] = [];
    if (options.deactivateInputController) {
      this.inputController!.deactivate(options.showLock);
      readyPromises.push(this.player!.idle());
    }
    if (options.showActionHint) {
      readyPromises.push(this.player!.activateActionHint());
    }
    const executeBefore = async () => {
      options.executeBefore?.();
      await Promise.all(readyPromises);
      if (!options.deactivateInputController) {
        this.readyAction = undefined;
      }
    };
    await action.execute({ executeBefore });
    if (options.deactivateInputController) {
      this.readyAction = undefined;
      if (
        (options.reactivateInputController ?? true) &&
        !this.inputController!.isActive
      ) {
        this.inputController!.activate();
      }
    }
  }

  private processObjectLayer(
    map: Tilemap,
    name: string,
    worldHeight: number,
    noImageKeys?: string[]
  ) {
    const layer = map.getObjectLayer(name)!;
    const [depth, isZoneLayer, opacity, parallaxFactorX, parallaxFactorY] =
      getTiledProperties(
        layer,
        "depth",
        "is-zone-layer",
        "opacity",
        "parallax-factor-x",
        "parallax-factor-y"
      );
    const imageObjects: ImageObject[] = [];
    const noImageObjects: NoImageObject[] = [];
    const zoneObjects: ZoneObject[] = [];
    layer.objects.forEach(object => {
      const position = new Vector(object.x!, object.y);
      const name = object.name;
      const key = object.type;
      let imageKey = this.getImageKey(key);
      if (
        !this.textures.exists(ATLAS_KEY) ||
        !this.textures.get(ATLAS_KEY).has(imageKey)
      ) {
        imageKey = getImageKey("global", key);
      }
      const properties = getAllTiledProperties(object);
      const objectParallaxFactor = new Vector(
        properties.get("parallax-factor-x") ?? parallaxFactorX ?? 1,
        properties.get("parallax-factor-y") ?? parallaxFactorY ?? 1
      );
      const x = position.x;
      const y = position.y + worldHeight - map.heightInPixels - object.height!;
      if (isZoneLayer) {
        zoneObjects.push({
          name,
          key,
          zone: new Zone(
            this,
            x,
            y + object.height!,
            object.width,
            object.height
          ).setOrigin(0),
        });
      } else if (noImageKeys?.includes(key) ?? false) {
        noImageObjects.push({ name, key, x, y, object, properties });
      } else {
        const image = this.add.image(x, y, ATLAS_KEY, imageKey).setOrigin(0);
        if (object.flippedHorizontal) {
          image.setFlipX(true);
        }
        if (object.flippedVertical) {
          image.setFlipY(true);
        }
        if (depth !== undefined) {
          image.setDepth(depth);
        }
        image.setScrollFactor(objectParallaxFactor.x, objectParallaxFactor.y);
        const objectDepth = properties.get("depth");
        if (objectDepth !== undefined) {
          image.setDepth(objectDepth);
        }
        const objectOpacity = properties.get("opacity") ?? opacity;
        if (objectOpacity !== undefined) {
          image.setAlpha(objectOpacity);
        }
        imageObjects.push({ name, key, image, properties });
      }
    });
    return { imageObjects, noImageObjects, zoneObjects };
  }

  protected processTileMap(
    key: string,
    tilesetName?: TilesetName,
    noImageKeys?: string[]
  ) {
    const worldHeight = this.cameras.main.getBounds().height;
    const map = this.make.tilemap({ key });
    const layers = new Map<string, phaser.Tilemaps.TilemapLayer>();
    if (tilesetName !== undefined) {
      const tileset = map.addTilesetImage(
        tilesetName,
        getTilesetKey(tilesetName)
      ) as Tileset;
      for (const { name } of map.layers) {
        const layer = this.createTiledLayer(map, tileset, name, worldHeight);
        layers.set(name, layer);
      }
    }
    for (const name of map.objects.map(({ name }) => name)) {
      const { imageObjects, noImageObjects, zoneObjects } =
        this.processObjectLayer(map, name, worldHeight, noImageKeys);
      this.processNoImageObjects(noImageObjects);
      this.processImageObjects(imageObjects);
      this.processZoneObjects(zoneObjects);
    }
    return layers;
  }

  protected processImageObjects(_imageObjects: ImageObject[]) {}

  protected processNoImageObjects(_noImageObjects: NoImageObject[]) {}

  protected processZoneObjects(_zoneObjects: ZoneObject[]) {}

  private pause() {
    if (this.scene.isPaused()) {
      return;
    }
    this.sound.pauseAll();
    const pauseScene = this.scene.get(sceneKeys.pause);
    this.scene.launch(pauseScene).bringToTop(pauseScene);
    pauseScene.events.once(events.scene.shutdown, () => {
      while (this.pausedSceneKeys.length > 0) {
        this.scene.resume(this.pausedSceneKeys.pop());
      }
      this.sound.resumeAll();
    });
    for (const scene of this.scene.manager.getScenes()) {
      this.pausedSceneKeys.push(scene.scene.key as SceneKey);
      scene.scene.pause();
    }
  }

  protected async say(
    object: GameObject & GetBounds,
    text: MultilineText,
    options?: {
      depth?: number;
      duration?: number;
      offsetX?: number;
      offsetY?: number;
      colors?: ColorOptions;
    }
  ) {
    const balloon = new Balloon(object, text, undefined, options?.colors);
    if (options !== undefined) {
      if (options.depth !== undefined) {
        balloon.setDepth(options.depth);
      }
      if (options.offsetX !== undefined || options.offsetY !== undefined) {
        balloon.setOffset(options.offsetX ?? 0, options.offsetY ?? 0);
      }
    }
    await this.delay(options?.duration ?? defaultTextDuration(text));
    balloon.destroy();
  }

  protected async scrollCamera(
    endPosition: Vector,
    duration: number,
    ease = easing.linear
  ) {
    const camera = this.cameras.main;
    const cameraBounds = camera.getBounds();
    const startPosition = new Vector(camera.scrollX, camera.scrollY);

    // clamp camera end position into camera bounds
    endPosition.x = Math.min(
      Math.max(cameraBounds.x, endPosition.x),
      cameraBounds.x + cameraBounds.width - camera.width
    );
    endPosition.y = Math.min(
      Math.max(cameraBounds.y, endPosition.y),
      cameraBounds.y + cameraBounds.height - camera.height
    );

    // return if no camera scolling required
    if (startPosition.fuzzyEquals(endPosition)) {
      return;
    }

    const interpolator = new TimedInterpolator(duration, ease);
    await new Promise<void>(async resolve => {
      interpolator.update(this.time.now);
      while (!interpolator.isComplete) {
        await this.nextUpdate();
        const ratio = interpolator.update(this.time.now);
        const position = startPosition.clone().lerp(endPosition, ratio);
        camera.setScroll(position.x, position.y);
      }
      resolve();
    });
  }

  protected setBounds(width: number, height: number) {
    this.physics.world.setBounds(0, 0, width, height);
    this.cameras.main.setBounds(0, 0, width, height);
  }

  protected async restart() {
    this.start("current", true);
  }

  protected async restartGame() {
    this.sound.stopAll();
    this.start("title", true);
  }

  private async start(
    scene: "current" | "next" | "title",
    omitPlayerTransition: boolean
  ) {
    if (this.player !== undefined && !omitPlayerTransition) {
      if (this.inputController!.isActive) {
        this.inputController!.deactivate(false);
        await this.player.idle();
      }
      await this.runPlayerTransition(this.player);
    }
    const scenes = this.registry.get(registryKeys.sceneManager) as SceneManager;
    if (scene === "title") {
      scenes.setNext("title");
      scene = "next";
    }
    const { key, level, name, music }: SceneConfig =
      scene === "next" ? scenes.next : scenes.current;
    if (scenes.showLevelScene && name !== undefined) {
      await this.runLevelScene(name, level, music);
    }
    if (music !== undefined) {
      if (this.sound.getAllPlaying().every(sound => sound.key !== music)) {
        switch (music) {
          case "theme":
            this.getThemeMusic().play("loop");
            break;
        }
      }
    }
    this.scene.start(key);
    this.scene.launch(sceneKeys.notification);
    this.scene.get(sceneKeys.notification).scene.bringToTop();
  }

  private async runLevelScene(name: string, level?: number, music?: string) {
    await new Promise(resolve => {
      this.scene.start(sceneKeys.level, {
        level,
        name,
        music,
        callback: resolve,
      } as LevelSceneOptions);
    });
    this.scene.stop(sceneKeys.level);
  }

  private async runPlayerTransition(player: Player) {
    const winSound = this.getMusic("win").setVolume(0.75);
    const playingMusic = this.getPlayingMusic();
    if (playingMusic !== null) {
      fadeOutMusic(this, playingMusic, 125);
    }
    winSound.play();
    player.wink();
    const toPosition = player.getCenter().subtract(this.cameras.main.worldView);
    const stopPosition = toPosition;
    const endPosition = toPosition.clone().add({ x: 0, y: -3 });
    const stopDimensions = new Vector(10, 16);
    await new Promise<void>(resolve => {
      const options: RectTransitionOptions = {
        toDimensions: stopDimensions,
        toPosition: stopPosition,
        ease: easing.sine.in,
        callback: resolve,
      };
      this.scene
        .launch(sceneKeys.rectTransition, options)
        .bringToTop(sceneKeys.rectTransition);
    });
    await this.delay(2500);
    await new Promise<void>(resolve => {
      const options: RectTransitionOptions = {
        fromDimensions: stopDimensions,
        fromPosition: stopPosition,
        toPosition: endPosition,
        duration: 250,
        callback: resolve,
      };
      this.scene.launch(sceneKeys.rectTransition, options);
    });
    await this.delay(1500);
    this.scene.stop(sceneKeys.rectTransition);
    player.unfreeze();
  }
}
