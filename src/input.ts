import {
  Control,
  ControlState,
  KeyControl,
  MultiControl,
  VirtualControl,
} from "./controls";
import { environment, registryKeys } from "./game";
import { events, getImageKey } from "./helpers";

import { ATLAS_KEY } from "./config";
import { EventEmitter } from "./phaser";
import { Player } from "./sprite/player";
import { Vehicle } from "./sprite/vehicle";
import phaser from "phaser";

export type Controls = { [key in Action]: Control };

export type GamepadActionMapping = {
  [key in Action]: { index: number; key: string };
};

type ControlEvent = (typeof controlEvents)[keyof typeof controlEvents];

type Gamepad = typeof phaser.Input.Gamepad;

type GamepadButton = phaser.Input.Gamepad.Button;

type GamepadPlugin = phaser.Input.Gamepad.GamepadPlugin;

type InputPlugin = phaser.Input.InputPlugin;

type KeyboardPlugin = phaser.Input.Keyboard.KeyboardPlugin;

type Pointer = phaser.Input.Pointer;

const enum Action {
  Action = "action",
  Jump = "jump",
  Left = "left",
  Right = "right",
  Start = "start",
}

export const controlEvents = {
  actionDown: "control-action-down",
  actionUp: "control-action-up",
  startDown: "control-start-down",
  startUp: "control-start-up",
};

const keyCodes = phaser.Input.Keyboard.KeyCodes;

const lockIconMargin = 2;

export function createGameControls(input: InputPlugin): Controls {
  const controls = {
    action: new MultiControl(),
    jump: new MultiControl(),
    left: new MultiControl(),
    right: new MultiControl(),
    start: new MultiControl(),
  };
  for (const deviceControls of [
    createKeyboardControls(input.keyboard!),
    createGamepadControls(input.gamepad!),
    createPointerControls(input),
  ]) {
    for (const [action, control] of Object.entries(deviceControls)) {
      controls[action as Action].add(control);
    }
  }
  return controls;
}

function createGamepadControls(gamepad: GamepadPlugin): Controls {
  const controls = {
    action: new VirtualControl(),
    jump: new VirtualControl(),
    left: new VirtualControl(),
    right: new VirtualControl(),
    start: new VirtualControl(),
  };
  const mapping = new Map(
    Object.entries(
      gamepad.scene.registry.get(
        registryKeys.gamepadActionMapping
      ) as GamepadActionMapping
    ).map(([action, { index }]) => [index, action as Action])
  );
  gamepad.on(events.gamepad.down, (_: Gamepad, { index }: GamepadButton) => {
    const action = mapping.get(index);
    if (action !== undefined) {
      controls[action].set("down");
    }
  });
  gamepad.on(events.gamepad.up, (_: Gamepad, { index }: GamepadButton) => {
    const action = mapping.get(index);
    if (action !== undefined) {
      controls[action].set("up");
    }
  });
  return controls;
}

function createKeyboardControls(keyboard: KeyboardPlugin): Controls {
  const createKeyControl = (keyCode: number) =>
    new KeyControl(keyboard.addKey(keyCode));
  return {
    action: createKeyControl(keyCodes.A),
    jump: createKeyControl(keyCodes.SPACE),
    left: createKeyControl(keyCodes.LEFT),
    right: createKeyControl(keyCodes.RIGHT),
    start: createKeyControl(keyCodes.ENTER),
  };
}

function createPointerControls(input: InputPlugin): Controls {
  const controls = {
    action: new VirtualControl(),
    jump: new VirtualControl(),
    left: new VirtualControl(),
    right: new VirtualControl(),
    start: new VirtualControl(),
  };
  let activePointers = new Map<number, Action>();
  input.on(
    events.pointer.down,
    ({ button, id, position: { x, y } }: Pointer) => {
      if (button === 0) {
        if (y < input.scene.renderer.height / 2) {
          controls.jump.set("down");
          activePointers.set(id, Action.Jump);
        } else if (x < input.scene.renderer.width / 2) {
          controls.left.set("down");
          activePointers.set(id, Action.Left);
        } else {
          controls.right.set("down");
          activePointers.set(id, Action.Right);
        }
      }
    }
  );
  const handlePointerUp = ({ button, id }: Pointer) => {
    if (button === 0) {
      const activePointerAction = activePointers.get(id);
      if (activePointerAction !== undefined) {
        controls[activePointerAction].set("up");
      }
      activePointers.delete(id);
    }
  };
  input.on(events.pointer.up, handlePointerUp);
  input.on(events.pointer.upOutside, handlePointerUp);
  const eventCenter: EventEmitter = input.scene.registry.get(
    registryKeys.eventCenter
  );
  for (const [event, control, state] of [
    [controlEvents.actionDown, controls.action, "down"],
    [controlEvents.actionUp, controls.action, "up"],
    [controlEvents.startDown, controls.start, "down"],
    [controlEvents.startUp, controls.start, "up"],
  ] as [ControlEvent, VirtualControl, ControlState][]) {
    const handleEvent = () => control.set(state);
    eventCenter.on(event, handleEvent);
    input.scene.events.on(events.scene.shutdown, () => {
      eventCenter.off(event, handleEvent);
    });
  }
  return controls;
}

export class PlayerInputController {
  private deactivationCount = 0;

  private lock;

  constructor(private player: Player, private controls: Controls) {
    this.lock = this.player.object.scene.add
      .image(
        lockIconMargin,
        lockIconMargin,
        ATLAS_KEY,
        getImageKey("global", "lock")
      )
      .setOrigin(0)
      .setDepth(Infinity)
      .setScrollFactor(0)
      .setVisible(false);
  }

  public get isActive() {
    return this.deactivationCount === 0;
  }

  public activate() {
    this.deactivationCount--;
    if (this.deactivationCount === 0) {
      this.lock.setVisible(false);
    } else if (this.deactivationCount < 0 && environment === "development") {
      throw new Error("deactivation count is less than zero");
    }
  }

  public deactivate(showLock = true) {
    if (showLock) {
      this.lock.setVisible(true);
    }
    this.deactivationCount++;
    if (this.deactivationCount > 1 && environment === "development") {
      console.warn(
        "PlayerInputController deactivation count is larger than one."
      );
    }
  }

  public update() {
    if (!this.isActive) {
      return;
    }
    if (this.controls.left.isDown) {
      this.player.walkLeft();
    } else if (this.controls.right.isDown) {
      this.player.walkRight();
    } else {
      this.player.idle();
    }
    if (this.controls.jump.isDown) {
      this.player.jump();
    }
  }
}

export class VehicleInputController {
  private active = true;

  private lock;

  constructor(private vehicle: Vehicle, private controls: Controls) {
    this.lock = this.vehicle.object.scene.add
      .image(
        lockIconMargin,
        lockIconMargin,
        ATLAS_KEY,
        getImageKey("global", "lock")
      )
      .setOrigin(0)
      .setDepth(Infinity)
      .setScrollFactor(0)
      .setVisible(false);
  }

  public activate() {
    this.lock.setVisible(false);
    this.active = true;
  }

  public deactivate(showLock = true) {
    if (showLock) {
      this.lock.setVisible(true);
    }
    this.active = false;
  }

  public update() {
    if (!this.active) {
      return;
    }
    if (this.controls.left.isDown) {
      this.vehicle.driveLeft();
    } else if (this.controls.right.isDown) {
      this.vehicle.driveRight();
    } else {
      this.vehicle.idle();
    }
  }
}
