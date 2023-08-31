import { SpriteWithDynamicBody } from "../phaser";
import { events } from "../helpers";

export class Vehicle {
  constructor(
    public object: SpriteWithDynamicBody,
    private maxSpeed: number,
    private acceleration: number,
    private brakeAcceleration: number
  ) {}

  public driveLeft() {
    this.object.setFlipX(true);
    if (this.object.body.velocity.x > 0) {
      this.object.setAccelerationX(-this.brakeAcceleration);
      return;
    }
    if (this.object.body.velocity.x < -this.maxSpeed) {
      this.object.setAccelerationX(0);
      this.object.setVelocityX(-this.maxSpeed);
    } else {
      this.object.setAccelerationX(-this.acceleration);
    }
  }

  public driveRight() {
    this.object.setFlipX(false);
    if (this.object.body.velocity.x < 0) {
      this.object.setAccelerationX(+this.brakeAcceleration);
      return;
    }
    if (this.object.body.velocity.x > this.maxSpeed) {
      this.object.setAccelerationX(0);
      this.object.setVelocityX(this.maxSpeed);
    } else {
      this.object.setAccelerationX(this.acceleration);
    }
  }

  public idle() {
    if (this.object.body.velocity.x < -this.maxSpeed / 16) {
      this.object.setAccelerationX(this.brakeAcceleration);
    } else if (this.object.body.velocity.x > this.maxSpeed / 16) {
      this.object.setAccelerationX(-this.brakeAcceleration);
    } else {
      this.object.setAccelerationX(0);
      this.object.setVelocityX(0);
      return true;
    }
    return false;
  }

  public async stop() {
    const update = () => {
      if (this.idle()) {
        this.object.scene.events.off(events.scene.update, update);
        resolvePromise();
      }
    };
    this.object.scene.events.on(events.scene.update, update);
    let resolvePromise: () => void;
    return new Promise<void>(resolve => {
      resolvePromise = resolve;
    });
  }

  public targetLeft() {
    this.object.setFlipX(true);
  }

  public targetRight() {
    this.object.setFlipX(false);
  }
}
