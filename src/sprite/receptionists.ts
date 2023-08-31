import { createSpriteAnimations, getSpriteSheet } from "../helpers";

import { MultilineText } from "../text";
import { Person } from "./person";
import { Scene } from "../phaser";
import { Vector } from "../phaser";
import { colors } from "../config";

type Gossip = [number, MultilineText];

const enum State {
  Look,
  Talk,
  Wait,
}

export class Receptionists {
  private colors = {
    aggressive: { fill: colors.pink, text: colors.white },
    normal: { fill: colors.white, text: colors.pink },
  };

  private gossipIndex = 0;

  private left;

  private right;

  private state = State.Talk;

  public object;

  constructor(scene: Scene, x: number, y: number, private gossip: Gossip[]) {
    const { key, info } = getSpriteSheet(
      scene.registry,
      "lobby",
      "receptionists"
    );
    this.object = scene.add.sprite(x, y, key).setOrigin(0).setSize(33, 14);
    createSpriteAnimations(this.object, key, info);
    this.object.anims.get("talk").repeat = -1;
    this.left = new Person(this.object)
      .setBalloonOffset(new Vector(-6, -6))
      .setMaxCharsPerLine(20);
    this.right = new Person(this.object)
      .setBalloonOffset(new Vector(13, -6))
      .setMaxCharsPerLine(20);
    this.talk();
  }

  public set speechType(speechType: "normal" | "aggressive") {
    if (speechType === "normal") {
      this.left.setBalloonColors(this.colors.normal);
      this.right.setBalloonColors(this.colors.normal);
    } else {
      this.left.setBalloonColors(this.colors.aggressive);
      this.right.setBalloonColors(this.colors.aggressive);
    }
  }

  public look() {
    this.left.unsay();
    this.right.unsay();
    this.object.anims.play("look", true);
    this.state = State.Look;
  }

  public async talk() {
    this.object.anims.play("talk", true);
    this.object.anims.get("talk").resume();
    this.state = State.Talk;
    this.speechType = "normal";
    while (this.state === State.Talk) {
      const [person, text] = this.gossip[this.gossipIndex]!;
      await this.say(text, person);
      this.gossipIndex = (this.gossipIndex + 1) % this.gossip.length;
    }
  }

  public async say(text: MultilineText, receptionist: number) {
    return (receptionist === 1 ? this.left : this.right).say(text, "center");
  }

  public resetTalk() {
    this.gossipIndex = 0;
  }

  public unsay() {
    this.left.unsay();
    this.right.unsay();
  }

  public stopTalking() {
    this.unsay();
    this.object.anims.play("talk", false);
    this.object.anims.get("talk").pause();
    this.state = State.Wait;
  }
}
