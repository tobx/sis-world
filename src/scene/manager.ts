import { MusicKey } from "./boot";
import { SceneKey } from "../config";

export type SceneConfig = {
  key: SceneKey;
  level?: number;
  music?: MusicKey;
  name?: string;
};

export class SceneManager {
  private nextSceneIndex;

  constructor(
    private order: SceneConfig[],
    startSceneKey: SceneKey,
    private _showLevelScene: boolean
  ) {
    this.nextSceneIndex = this.order.findIndex(
      ({ key }) => key === startSceneKey
    );
    if (this.nextSceneIndex === -1) {
      throw new Error("invalid scene key: " + startSceneKey);
    }
  }

  public get showLevelScene() {
    return this._showLevelScene;
  }

  public get current() {
    return this.order[this.nextSceneIndex - 1]!;
  }

  public get next() {
    return this.order[this.nextSceneIndex++]!;
  }

  public setNext(sceneKey: SceneKey) {
    this.nextSceneIndex = this.order.findIndex(({ key }) => key === sceneKey);
  }
}
