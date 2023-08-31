import {
  createSpriteAnimations,
  getSound,
  getSpriteSheet,
  playSpriteAnimation,
} from "../helpers";

import { Scene } from "../phaser";

export class BarrierGate {
  private active = true;

  public object;

  private sirenSound;

  private wreckSound;

  constructor(scene: Scene, x: number, y: number) {
    const { key, info } = getSpriteSheet(
      scene.registry,
      "lobby",
      "barrier-gate"
    );
    this.object = scene.physics.add
      .staticSprite(x, y, key)
      .setOrigin(0)
      .setSize(17, 13);
    this.object.body.setOffset(this.object.width / 2, this.object.height / 2);
    createSpriteAnimations(this.object, key, info);
    this.object.anims.get("alarm").repeat = -1;
    this.sirenSound = getSound(scene, "siren", { loop: true, volume: 1 / 12 });
    this.wreckSound = getSound(scene, "wreck", { volume: 1 / 2 });
    this.idle();
  }

  public get isActive() {
    return this.active;
  }

  public alarm() {
    let sirenCounter = 0;
    const loopHandler = () => {
      sirenCounter++;
      if (sirenCounter === 4) {
        this.sirenSound.stop();
        this.sirenSound.off("looped", loopHandler);
      }
    };
    this.sirenSound.on("looped", loopHandler);
    this.sirenSound.play();
    this.object.anims.play("alarm", true);
  }

  public idle() {
    this.object.anims.play("idle");
  }

  public async wreck() {
    this.active = false;
    this.wreckSound.play();
    await playSpriteAnimation(this.object, "wreck", true);
    this.wreckSound.stop();
  }
}
