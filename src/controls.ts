import { events } from "./helpers";
import phaser from "phaser";

export type ControlState = "down" | "up";

type PhaserKey = phaser.Input.Keyboard.Key;

type Listener = () => void;

export abstract class Control {
  public abstract get isDown(): boolean;

  public abstract get isUp(): boolean;

  public abstract off(state: ControlState, listener: Listener): void;

  public abstract on(state: ControlState, listener: Listener): void;

  public abstract once(state: ControlState, listener: Listener): void;

  public static async allReleased(...controls: Control[]) {
    return Promise.all(controls.map(control => control.released()));
  }

  public static async anyPressed(...controls: Control[]) {
    return Promise.race(controls.map(control => control.pressed()));
  }

  public async pressed() {
    if (!this.isDown) {
      return this.stateIs("down");
    }
  }

  public async released() {
    if (!this.isUp) {
      return this.stateIs("up");
    }
  }

  private async stateIs(state: ControlState) {
    return new Promise<void>(resolve => this.once(state, resolve));
  }
}

export class KeyControl extends Control {
  private downListenerWrappers = new Map<Listener, (key: PhaserKey) => void>();

  constructor(private key: PhaserKey) {
    super();
  }

  public get isDown() {
    return this.key.isDown;
  }

  public get isUp() {
    return this.key.isUp;
  }

  private getKeyEvent(state: ControlState) {
    switch (state) {
      case "down":
        return events.key.down;
      case "up":
        return events.key.up;
    }
  }

  public off(state: ControlState, listener: Listener) {
    const event = this.getKeyEvent(state);
    switch (state) {
      case "down":
        this.key.off(event, this.downListenerWrappers.get(listener));
        this.downListenerWrappers.delete(listener);
        break;
      case "up":
        this.key.off(event, listener);
        break;
    }
  }

  public on(state: ControlState, listener: Listener) {
    const event = this.getKeyEvent(state);
    switch (state) {
      case "down":
        this.key.on(event, this.wrapDownListener(listener));
        break;
      case "up":
        this.key.on(event, listener);
        break;
    }
  }

  public once(state: ControlState, listener: Listener) {
    const event = this.getKeyEvent(state);
    switch (state) {
      case "down":
        this.key.once(event, this.wrapDownListener(listener));
        break;
      case "up":
        this.key.once(event, listener);
        break;
    }
  }

  // wrap down listener to ignore automatic key repetitions
  private wrapDownListener(listener: Listener) {
    const wrapper = (key: PhaserKey) => {
      if (!key.originalEvent.repeat) {
        listener();
      }
    };
    this.downListenerWrappers.set(listener, wrapper);
    return wrapper;
  }
}

export class VirtualControl extends Control {
  private state: ControlState = "up";

  private listeners: { [key in ControlState]: Set<Listener> } = {
    down: new Set(),
    up: new Set(),
  };

  public get isDown() {
    return this.state === "down";
  }

  public get isUp() {
    return this.state === "up";
  }

  public off(state: ControlState, listener: Listener) {
    this.listeners[state].delete(listener);
  }

  public on(state: ControlState, listener: Listener) {
    this.listeners[state].add(listener);
  }

  public once(state: ControlState, listener: Listener) {
    const wrapper = () => {
      this.off(state, wrapper);
      listener();
    };
    this.on(state, wrapper);
  }

  public set(state: ControlState) {
    if (state !== this.state) {
      this.state = state;
      this.listeners[state].forEach(f => f());
    }
  }
}

export class MultiControl extends Control {
  private controls: Control[] = [];

  private listenerWrappers: {
    [key in ControlState]: Map<Listener, () => void>;
  } = {
    down: new Map(),
    up: new Map(),
  };

  public get isDown() {
    return this.controls.some(control => control.isDown);
  }

  public get isUp(): boolean {
    return this.controls.every(control => control.isUp);
  }

  public add(control: Control) {
    this.controls.push(control);
  }

  public off(state: ControlState, listener: Listener): void {
    const wrapper = this.listenerWrappers[state].get(listener);
    if (wrapper !== undefined) {
      for (const control of this.controls) {
        control.off(state, wrapper);
      }
    }
    this.listenerWrappers[state].delete(listener);
  }

  public on(state: ControlState, listener: Listener): void {
    const wrapper = this.wrapListener(listener, state);
    for (const control of this.controls) {
      control.on(state, wrapper);
    }
  }

  public once(state: ControlState, listener: Listener): void {
    const wrapper = this.wrapListener(listener, state);
    for (const control of this.controls) {
      control.once(state, wrapper);
    }
  }

  private wrapListener(listener: Listener, state: ControlState, once = false) {
    let condition: () => boolean;
    switch (state) {
      case "down":
        condition = () => this.controls.filter(c => c.isDown).length === 1;
        break;
      case "up":
        condition = () => this.controls.every(c => c.isUp);
        break;
    }
    const wrapper = () => {
      if (condition()) {
        if (once) {
          this.off(state, listener);
        }
        listener();
      }
    };
    this.listenerWrappers[state].set(listener, wrapper);
    return wrapper;
  }
}
