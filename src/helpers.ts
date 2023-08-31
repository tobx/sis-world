import {
  Image,
  Scene,
  SoundConfig,
  Sprite,
  SpriteWithDynamicBody,
  TiledObject,
  TiledProperties,
  Tilemap,
  Vector,
  WebAudioSound,
} from "./phaser";
import {
  ImageBase,
  MusicKey,
  SoundKey,
  SpriteSheetInfo,
  SpriteSheetInfoMap,
  TilesetName,
} from "./scene/boot";
import { MultilineText, getLines } from "./text";

import { isIterable } from "./utilities";
import phaser from "phaser";
import { registryKeys } from "./game";

type BitmapFontData = phaser.Types.GameObjects.BitmapText.BitmapFontData;

type LayerData = phaser.Tilemaps.LayerData;

type ObjectLayer = phaser.Tilemaps.ObjectLayer;

type PlayAnimationConfig = phaser.Types.Animations.PlayAnimationConfig;

export const easing = {
  linear: phaser.Math.Easing.Linear,
  quad: {
    inOut: phaser.Math.Easing.Quadratic.InOut,
    out: phaser.Math.Easing.Quadratic.Out,
  },
  sine: {
    in: phaser.Math.Easing.Sine.In,
    out: phaser.Math.Easing.Sine.Out,
  },
};

export const events = {
  core: {
    pause: phaser.Core.Events.PAUSE,
    resume: phaser.Core.Events.RESUME,
  },
  gamepad: {
    down: phaser.Input.Gamepad.Events.BUTTON_DOWN,
    up: phaser.Input.Gamepad.Events.BUTTON_UP,
  },
  key: {
    down: phaser.Input.Keyboard.Events.DOWN,
    up: phaser.Input.Keyboard.Events.UP,
  },
  load: {
    complete: phaser.Loader.Events.COMPLETE,
    progress: phaser.Loader.Events.PROGRESS,
  },
  object: {
    pointer: {
      down: phaser.Input.Events.GAMEOBJECT_POINTER_DOWN,
      out: phaser.Input.Events.GAMEOBJECT_POINTER_OUT,
      over: phaser.Input.Events.GAMEOBJECT_POINTER_OVER,
      up: phaser.Input.Events.GAMEOBJECT_POINTER_UP,
    },
  },
  pointer: {
    down: phaser.Input.Events.POINTER_DOWN,
    up: phaser.Input.Events.POINTER_UP,
    upOutside: phaser.Input.Events.POINTER_UP_OUTSIDE,
  },
  scale: {
    enterFullscreen: phaser.Scale.Events.ENTER_FULLSCREEN,
  },
  scene: {
    postUpdate: phaser.Scenes.Events.POST_UPDATE,
    shutdown: phaser.Scenes.Events.SHUTDOWN,
    update: phaser.Scenes.Events.UPDATE,
  },
  tween: {
    complete: phaser.Tweens.Events.TWEEN_COMPLETE,
  },
  world: {
    step: phaser.Physics.Arcade.Events.WORLD_STEP,
  },
};

export class Blinker {
  private invisibleDuration;

  private isBlinking = false;

  constructor(
    private object: Sprite | Image,
    private visibleDuration: number,
    invisibleDuration?: number
  ) {
    this.invisibleDuration = invisibleDuration ?? visibleDuration;
  }

  public async blink() {
    if (this.isBlinking) {
      return;
    }
    this.isBlinking = true;
    while (this.isBlinking) {
      this.object.setVisible(!this.object.visible);
      await delay(
        this.object.scene,
        this.object.visible ? this.visibleDuration : this.invisibleDuration
      );
    }
  }

  public stop() {
    this.isBlinking = false;
  }
}

/*
 * This is a workaround for pixel errors on iOS using BitmapText's align
 * argument (using phaser 3.60.0).
 */
export function createCenterAlignedBitmapText(
  scene: Scene,
  font: string,
  text: MultilineText,
  color: number
) {
  const { lineHeight } = getfontData(scene, font)!;
  const bitmapTextLines = getLines(text).map(text =>
    scene.make.bitmapText({ font, text }, false).setTint(color)
  );
  const width = bitmapTextLines.reduce(
    (width, text) => Math.max(width, text.width),
    0
  );
  const height = bitmapTextLines.length * lineHeight;
  const texture = scene.make.renderTexture({ width, height }, false);
  for (const [index, bitmapText] of bitmapTextLines.entries()) {
    const x = Math.floor((width - bitmapText.width) / 2);
    const y = index * lineHeight;
    texture.draw(bitmapText, x, y);
  }
  return texture;
}

export function createSpriteAnimations(
  sprite: Sprite,
  key: string,
  info: SpriteSheetInfo,
  keySuffix: string = ""
) {
  for (const { name, from, to } of info.tags) {
    const durations = info.durations.slice(from, to + 1);
    const totalDuration = durations.reduce((sum, value) => sum + value);
    const avgFrameDuration = totalDuration / durations.length;

    sprite.anims.create({
      key: name + keySuffix,
      frames: durations.map((duration, index) => ({
        key,
        frame: from + index,

        // this is not the total frame duration, but only the offset to the average frame duration
        duration: duration - avgFrameDuration,
      })),
      duration: totalDuration,
    });
  }
}

export async function fadeSoundTo(
  scene: Scene,
  music: WebAudioSound,
  volume: number,
  duration: number
) {
  return new Promise<void>(resolve => {
    scene.tweens
      .add({
        targets: music,
        volume,
        duration,
      })
      .on(events.tween.complete, resolve);
  });
}

export async function fadeOutMusic(
  scene: Scene,
  music: WebAudioSound,
  duration: number
) {
  await fadeSoundTo(scene, music, 0, duration);
  music.stop();
}

export function getfontData(
  scene: Scene,
  key: string
): BitmapFontData | undefined {
  return scene.cache.bitmapFont.get(key)?.data;
}

function getKey(...parts: string[]) {
  return parts.join("/");
}

export function getImageKey(base: ImageBase, name: string) {
  return getKey("images", base, name);
}

export function getTilesetKey(name: TilesetName) {
  return getKey("tilesets", name);
}

export function getMusic(scene: Scene, key: MusicKey, config?: SoundConfig) {
  return scene.sound.add(key, config) as WebAudioSound;
}

export function getSound(scene: Scene, key: SoundKey, config?: SoundConfig) {
  return scene.sound.add(key, config) as WebAudioSound;
}

export function getSpriteSheetKey(base: ImageBase, name: string) {
  return "sprites/" + getKey(base, name);
}

function getSpriteSheetInfo(registry: phaser.Data.DataManager) {
  return registry.get(registryKeys.spriteSheetInfoMap) as SpriteSheetInfoMap;
}

export function getSpriteSheet(
  registry: phaser.Data.DataManager,
  base: ImageBase,
  name: string
) {
  return {
    key: "sprites/" + getKey(base, name),
    info: getSpriteSheetInfo(registry)[base]![name]!,
  };
}

let delayFactor = 1;

export function setDelayFactor(value: number) {
  delayFactor = value;
}

export async function delay(
  scene: phaser.Scene,
  duration: number,
  gameTime = false
) {
  if (gameTime) {
    duration /= 1000;
    let accumulator = 0;
    const update = (delta: number) => {
      accumulator += delta;
      if (phaser.Math.Fuzzy.GreaterThan(accumulator, duration)) {
        scene.physics.world.off(events.world.step, update);
        resolvePromise();
      }
    };
    scene.physics.world.on(events.world.step, update);
    let resolvePromise: () => void;
    return new Promise<void>(resolve => {
      resolvePromise = resolve;
    });
  } else {
    return new Promise(resolve => {
      scene.time.delayedCall(delayFactor * duration, resolve);
    });
  }
}

export function getDimensionVector(
  object: phaser.GameObjects.Components.ComputedSize
) {
  return new Vector(object.width, object.height);
}

export function getAllTiledProperties(
  object: TiledObject | Tilemap | LayerData | ObjectLayer
) {
  const properties: TiledProperties = new Map();
  if (isIterable(object.properties)) {
    for (const { name, value } of object.properties) {
      properties.set(name, value);
    }
  }
  return properties;
}

export function getTiledProperties(
  object: TiledObject | Tilemap | LayerData | ObjectLayer,
  ...propertyNames: string[]
) {
  const properties = getAllTiledProperties(object);
  return propertyNames.map(name => properties.get(name));
}

export async function moveObjectTo(
  object: Image | Sprite,
  targetPosition: Vector,
  speed: number
) {
  const velocity = targetPosition
    .clone()
    .subtract(object)
    .normalize()
    .scale(speed);
  const direction = new Vector(Math.sign(velocity.x), Math.sign(velocity.y));
  const position = new Vector();
  const update = (delta: number) => {
    position.copy(velocity).scale(delta).add(object);
    if (direction.x * (position.x - targetPosition.x) >= 0) {
      position.x = targetPosition.x;
    }
    if (direction.y * (position.y - targetPosition.y) >= 0) {
      position.y = targetPosition.y;
    }
    object.setPosition(position.x, position.y);
    if (position.x === targetPosition.x && position.y === targetPosition.y) {
      object.scene.physics.world.off(events.world.step, update);
      resolvePromise();
    }
  };
  object.scene.physics.world.on(events.world.step, update);
  let resolvePromise: () => void;
  return new Promise<void>(resolve => {
    resolvePromise = resolve;
  });
}

export async function nextUpdate(scene: Scene) {
  return new Promise<void>(resolve =>
    scene.events.once(events.scene.update, resolve)
  );
}

export async function nextWorldStep(scene: Scene) {
  return new Promise<void>(resolve =>
    scene.physics.world.once(events.world.step, resolve)
  );
}

export function playRandomStepSound(scene: Scene, config: SoundConfig) {
  const keys: SoundKey[] = ["step-1", "step-2", "step-3", "step-4"];
  const key = keys[Math.floor(Math.random() * keys.length)]!;
  scene.sound.play(key, config);
}

export async function playSpriteAnimation(
  sprite: Sprite,
  key: string | PlayAnimationConfig,
  ignoreIfPlaying?: boolean,
  reverse?: boolean
) {
  const config = key;
  if (typeof key === "object") {
    key = (config as PlayAnimationConfig).key;
  }
  return new Promise<void>(resolve => {
    if (reverse === true) {
      sprite.anims
        .playReverse(config, ignoreIfPlaying)
        .once("animationcomplete-" + key, resolve);
    } else {
      sprite.anims
        .play(config, ignoreIfPlaying)
        .once("animationcomplete-" + key, resolve);
    }
  });
}

export class TimedInterpolator {
  public isComplete = false;

  private startTime = 0;

  constructor(private duration: number, private ease = easing.linear) {}

  public update(time: number) {
    if (this.startTime === 0) {
      this.startTime = time;
      return 0;
    }
    const elapsedTime = time - this.startTime;
    const t = elapsedTime / this.duration;
    if (t >= 1) {
      this.isComplete = true;
      return 1;
    }
    return this.ease(t);
  }
}

export class TimedLoop {
  private index = 0;

  private timer?: phaser.Time.TimerEvent;

  constructor(private actions: [() => void, number][]) {}

  public get isStopped() {
    return this.timer === undefined;
  }

  start(sprite: SpriteWithDynamicBody) {
    if (this.timer === undefined) {
      const [action, duration] = this.actions[this.index]!;
      action();
      this.timer = sprite.scene.time.delayedCall(duration, () => {
        this.timer = undefined;
        this.start(sprite);
      });
      this.index = (this.index + 1) % this.actions.length;
    }
  }

  stop() {
    this.timer?.destroy();
    this.timer = undefined;
  }
}

export async function until(scene: Scene, condition: () => boolean) {
  return new Promise<void>(resolve => {
    const update = () => {
      if (condition()) {
        scene.events.off(events.world.step, update);
        resolve();
      }
    };
    scene.events.on(events.scene.update, update);
  });
}
