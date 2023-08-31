import { Environment } from "./game";
import { GamepadActionMapping } from "./input";
import { SceneConfig } from "./scene/manager";
import { Config as ServoControllerConfig } from "./servo-controller";

export type SceneKey = (typeof sceneKeys)[keyof typeof sceneKeys];

export const ATLAS_KEY = "atlas";

export const colors = {
  atacamaWaterReflection: 0xdbe3de,
  black: 0x000000,
  blue: 0x4554a1,
  brown: 0x563f29,
  burgundy: 0x9e3b46,
  emerald: 0x13b685,
  gray: 0x808080,
  grayBlue: 0x587089,
  grayDark: 0x444240,
  green: 0x6abe30,
  greenLight: 0x99e550,
  orange: 0xf46a25,
  pink: 0xff0099,
  statePolice: 0x39435b,
  red: 0xff0000,
  white: 0xffffff,
  wood: 0xe5c994,
  yellow: 0xf9c339,
  yellowLight: 0xffeb57,
};

const environment: Environment = import.meta.env.PROD
  ? "production"
  : "development";

export const fonts = {
  normal: "04b03",
  heading1: "pixel-operator-hb",
  heading2: "pixel-operator-8",
  title: "pixel-operator-bold",
} as const;

const gamepadActionMapping: { [name: string]: GamepadActionMapping } = {
  standard: {
    action: { index: 0, key: "a" },
    jump: { index: 1, key: "b" },
    left: { index: 14, key: "dpad-left" },
    right: { index: 15, key: "dpad-right" },
    start: { index: 9, key: "start" },
  },
};

export const sceneKeys = {
  airport: "airport",
  atacama: "atacama",
  boot: "boot",
  credits: "credits",
  ending: "ending",
  fifthFloor: "fifth-floor",
  home: "home",
  jurmo: "jurmo",
  level: "level",
  lobby: "lobby",
  logos: "logos",
  notification: "notification",
  pause: "pause",
  preface: "preface",
  rectTransition: "rect-transition",
  sign: "sign",
  title: "title",
  tutorial: "tutorial",
} as const;

const sceneOrder: SceneConfig[] = [
  { key: "logos" },
  { key: "title" },
  { key: "tutorial", name: "Vorspiel", music: "theme" },
  { key: "preface" },
  { key: "home", level: 1, name: "Dahoam", music: "theme" },
  { key: "lobby", level: 2, name: "Meeting", music: "theme" },
  { key: "fifth-floor", music: "theme" },
  { key: "atacama", level: 3, name: "Neuland", music: "theme" },
  { key: "jurmo", music: "theme" },
  { key: "airport", level: 4, name: "Notfall", music: "theme" },
  { key: "ending", name: "Nachspiel", music: "theme" },
  { key: "credits" },
];

const servoControllerConfig: ServoControllerConfig | undefined =
  import.meta.env.VITE_SERVO_CONTROLLER_URL === undefined ||
  import.meta.env.VITE_RING_SERVO_NAME === undefined ||
  import.meta.env.VITE_RING_SERVO_PUSH_POSITION === undefined ||
  import.meta.env.VITE_RING_SERVO_RESET_POSITION === undefined
    ? undefined
    : {
        url: import.meta.env.VITE_SERVO_CONTROLLER_URL,
        ringServo: {
          name: import.meta.env.VITE_RING_SERVO_NAME,
          positions: {
            push: import.meta.env.VITE_RING_SERVO_PUSH_POSITION,
            reset: import.meta.env.VITE_RING_SERVO_RESET_POSITION,
          },
        },
      };

const startSceneKey =
  (import.meta.env.DEV
    ? (import.meta.env.VITE_START_SCENE as SceneKey | undefined)
    : undefined) ?? sceneKeys.logos;

export const themeMarkers = {
  ending: "ending",
  intro: "intro",
  loop: "loop",
};

export const game = {
  app: {
    author: {
      url: __APP_AUTHOR_URL__,
    },
    title: "Sis World",
    url: __APP_URL__,
    version: __APP_VERSION__,
  },
  assets: {
    atlases: "assets/atlases",
    fonts: "assets/fonts",
    images: "assets/images",
    lang: "assets/lang",
    music: "assets/music",
    sounds: "assets/sounds",
    sprites: "assets/sprites",
    tilemaps: "assets/tilemaps",
    tilesets: "assets/tilesets",
  },
  audio: {
    mute: import.meta.env.VITE_MUTE_AUDIO === "true",
  },
  banner: {
    hidePhaser: import.meta.env.PROD,
  },
  debug: import.meta.env.DEV && import.meta.env.VITE_DEBUG === "true",
  disableStartClick:
    import.meta.env.DEV && import.meta.env.VITE_DISABLE_START_CLICK === "true",
  environment,
  gamepad: {
    actionMapping:
      gamepadActionMapping[import.meta.env.VITE_GAMEPAD_ACTION_MAPPING] ??
      gamepadActionMapping.standard,
  },
  language: import.meta.env.VITE_LANG ?? "en",
  locale: import.meta.env.VITE_LOCALE ?? "en-US",
  physics: {
    gravity: 500,
  },
  scene: {
    order: sceneOrder,
    showLevelScene:
      !import.meta.env.DEV || import.meta.env.VITE_SHOW_LEVEL_SCENE !== "false",
    startKey: startSceneKey,
  },
  screen: {
    width: 192,
    height: 108,
  },
  servoController: servoControllerConfig,
  time: {
    delayFactor: import.meta.env.DEV
      ? import.meta.env.VITE_DELAY_FACTOR ?? 1
      : 1,
  },
};
