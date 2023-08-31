import { Scene, Vector } from "../phaser";

import { ATLAS_KEY } from "../config";
import { getImageKey } from "../helpers";
import phaser from "phaser";

export class Escalator {
  private preStair;

  private postStair;

  private stairs;

  private velocity;

  constructor(
    public scene: Scene,
    private position: Vector,
    direction: "up" | "down",
    stairCount: number,
    private stairDimensions: Vector,
    stairsPerSecond: number
  ) {
    this.velocity = stairDimensions.clone().scale(stairsPerSecond);
    if (direction === "up") {
      this.position.y += stairCount * stairDimensions.y;
      this.velocity.y = -this.velocity.y;
    }
    this.stairs = Array.from({ length: stairCount }, () => this.createStair());
    const stairImageWidth = scene.game.textures
      .get(getImageKey("airport", "escalator-stair"))
      .get(0).width;
    const scaleX = 1 + this.stairDimensions.x / stairImageWidth;
    this.preStair = this.createStair().setScale(scaleX, 1);
    this.postStair = this.createStair().setScale(scaleX, 1);
    this.reset();
  }

  private createStair() {
    const stair = this.scene.physics.add
      .image(0, 0, ATLAS_KEY, getImageKey("airport", "escalator-stair"))
      .setOrigin(0)
      .setDepth(-1)
      .setImmovable(true);
    stair.body.setAllowGravity(false);
    return stair;
  }

  private reset() {
    const direction = new Vector(
      Math.sign(this.velocity.x),
      Math.sign(this.velocity.y)
    );
    const stairDifference = direction.clone().multiply(this.stairDimensions);
    for (const [index, stair] of this.stairs.entries()) {
      const position = stairDifference.clone().scale(index).add(this.position);
      stair.setPosition(position.x, position.y);
    }
    const firstStair = this.stairs[0]!;
    const lastStair = this.stairs[this.stairs.length - 1]!;
    this.preStair.setPosition(
      firstStair.x - 2 * direction.x * this.stairDimensions.x,
      firstStair.y - phaser.Math.EPSILON
    );
    const postStairPositoin = direction
      .multiply(this.stairDimensions)
      .add(lastStair);
    this.postStair.setPosition(
      postStairPositoin.x,
      postStairPositoin.y - phaser.Math.EPSILON
    );
  }

  public addCollider(object: phaser.Types.Physics.Arcade.ArcadeColliderType) {
    for (const stair of this.stairs) {
      this.scene.physics.add.collider(object, stair);
    }
    this.scene.physics.add.collider(object, this.preStair);
    this.scene.physics.add.collider(object, this.postStair);
  }

  public start() {
    for (const stair of this.stairs) {
      stair.setVelocity(this.velocity.x, this.velocity.y);
    }
    this.preStair.setVelocityX(this.velocity.x);
    this.postStair.setVelocityX(this.velocity.x);
  }

  public stop() {
    for (const stair of this.stairs) {
      stair.setVelocity(0, 0);
    }
    this.preStair.setVelocityX(0);
    this.postStair.setVelocityX(0);
  }

  public update() {
    if (this.stairs[0]!.x >= this.position.x + this.stairDimensions.x) {
      this.reset();
    }
  }
}
