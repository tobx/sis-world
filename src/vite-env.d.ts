/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEBUG: string | undefined;
  readonly VITE_DISABLE_START_CLICK: string | undefined;
  readonly VITE_GAMEPAD_ACTION_MAPPING: string;
  readonly VITE_LANG: string;
  readonly VITE_LOCALE: string;
  readonly VITE_MUTE_AUDIO: string | undefined;
  readonly VITE_RING_SERVO_NAME: string | undefined;
  readonly VITE_RING_SERVO_PUSH_POSITION: number | undefined;
  readonly VITE_RING_SERVO_RESET_POSITION: number | undefined;
  readonly VITE_SERVO_CONTROLLER_URL: string | undefined;
  readonly VITE_SHOW_LEVEL_SCENE: string | undefined;
  readonly VITE_START_SCENE: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
