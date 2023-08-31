import { colors, fonts, themeMarkers } from "../config";

import { MusicKey } from "./boot";
import { Scene } from "./scene";
import { WebAudioSound } from "../phaser";

export type Options = {
  level?: number;
  name: string;
  music?: MusicKey;
  callback: () => void;
};

export class LevelScene extends Scene<Options, void> {
  constructor() {
    super("level", false);
  }

  public async create(options: Options) {
    super.create(options);
    const { level, name, music, callback } = options;
    this.sound.stopAll();
    const screenCenter = this.screenCenter;
    if (level !== undefined) {
      const levelText = "Level " + level;
      const textObject = this.add.bitmapText(0, 0, fonts.heading2, levelText);
      textObject
        .setPosition(
          screenCenter.x - textObject.width / 2,
          screenCenter.y - textObject.height / 2 - 16
        )
        .setTint(colors.yellow);
    }
    const nameText = this.add.bitmapText(0, 0, fonts.title, name);
    const nameTextOffsetY = level === undefined ? 0 : 8;
    nameText
      .setPosition(
        screenCenter.x - nameText.width / 2,
        screenCenter.y - nameText.height / 2 + nameTextOffsetY
      )
      .setTint(colors.orange);
    await this.playMusic(music);
    callback();
  }

  private async playMusic(key?: MusicKey) {
    let music: WebAudioSound | undefined;
    switch (key) {
      case "theme":
        music = this.getThemeMusic();
        break;
    }
    const intro = this.getIntroMusic();
    if (music === undefined) {
      return this.delay(4000);
    } else {
      return new Promise<void>(resolve => {
        // try to start the loop as close as possible to the intro's end
        this.time.delayedCall(0, () => {
          intro.play(themeMarkers.intro);
        });
        this.time.delayedCall(4000, () => {
          music!.play(themeMarkers.loop);
          resolve();
        });
      });
    }
  }
}
