import { ATLAS_KEY, colors } from "./config";
import { ImageWithDynamicBody, RenderTexture, Scene, Vector } from "./phaser";
import {
  delay,
  events,
  getImageKey,
  nextUpdate,
  nextWorldStep,
} from "./helpers";

import phaser from "phaser";

type ParticleEmitter = phaser.GameObjects.Particles.ParticleEmitter;

export class Fireworks {
  private emitterConfig = {
    frame: getImageKey("global", "white-pixel"),
    frequency: -1,
    gravityY: 12,
    lifespan: 4000,
    quantity: 64,
    speed: { min: 8, max: 64 },
  };

  private emitterPool: ParticleEmitter[] = [];

  private flashPool: RenderTexture[] = [];

  private gravity = 12;

  private rng: phaser.Math.RandomDataGenerator;

  private rocketPool: ImageWithDynamicBody[] = [];

  private soundConfig = { volume: 1 / 2 };

  constructor(
    private scene: Scene,
    randomSeed: string,
    private depth: { min: number; max: number }
  ) {
    this.rng = new phaser.Math.RandomDataGenerator([randomSeed]);
  }

  private async delay(duration: number) {
    return delay(this.scene, duration, true);
  }

  private async explode(x: number, y: number, color: number) {
    const emitter = this.getEmitter();
    emitter.particleX = x;
    emitter.particleY = y;
    emitter.setParticleTint(color);
    emitter.explode();
    const update = () => {
      emitter.forEachAlive(
        particle => this.updateParticle(particle),
        undefined
      );
    };
    this.scene.physics.world.on(events.world.step, update);
    const lifespan = this.emitterConfig.lifespan;
    emitter.forEachAlive(async particle => {
      await this.delay(lifespan / 4 - this.rng.realInRange(0, lifespan / 6));
      particle.alpha = 0.75;
      await this.delay(lifespan / 4 - this.rng.realInRange(0, lifespan / 6));
      particle.alpha = 0.5;
      await this.delay(lifespan / 4);
      particle.tint = colors.white;
      for (let i = 0; i < Math.floor(lifespan / 4 / 100); i++) {
        particle.alpha = this.rng.between(0, 2) / 2;
        await this.delay(100);
      }
      particle.alpha = 0;
    }, undefined);
    await this.delay(750);
    this.scene.sound.play("fireworks", this.soundConfig);
    while (emitter.getAliveParticleCount() > 0) {
      await nextWorldStep(this.scene);
    }
    this.scene.physics.world.off(events.world.step, update);
    this.recycleEmitter(emitter);
  }

  private async flash(color: number) {
    const flash = this.getFlash()
      .setTint(color)
      .setAlpha(1 / 6);
    await this.delay(100);
    flash.setAlpha(1 / 12);
    await this.delay(100);
    this.recycleFlash(flash);
  }

  private getEmitter(): ParticleEmitter {
    if (this.emitterPool.length > 0) {
      return this.emitterPool.pop()!;
    } else {
      return this.scene.make
        .particles({
          key: ATLAS_KEY,
          config: this.emitterConfig,
        })
        .setDepth(this.depth.max);
    }
  }

  private getFlash(): RenderTexture {
    if (this.flashPool.length > 0) {
      return this.flashPool.pop()!.setVisible(true);
    } else {
      const { width, height } = this.scene.renderer;
      return this.scene.add
        .renderTexture(0, 0, width, height)
        .setOrigin(0)
        .setDepth(this.depth.min)
        .fill(colors.white);
    }
  }

  private getRocket(position: Vector): ImageWithDynamicBody {
    if (this.rocketPool.length > 0) {
      return this.rocketPool
        .pop()!
        .enableBody(true, position.x, position.y, true, true);
    }
    return this.scene.physics.add
      .image(
        position.x,
        position.y,
        ATLAS_KEY,
        getImageKey("global", "white-pixel")
      )
      .setGravityY(this.gravity - this.scene.physics.config.gravity!.y!)
      .setDepth((this.depth.min + this.depth.max) / 2)
      .setTint(colors.yellowLight);
  }

  private recycleEmitter(emitter: ParticleEmitter) {
    this.emitterPool.push(emitter);
  }

  private recycleFlash(flash: RenderTexture) {
    this.flashPool.push(flash.setVisible(false));
  }

  private recycleRocket(rocket: ImageWithDynamicBody) {
    this.rocketPool.push(rocket.disableBody(true, true));
  }

  public async launchRocket(
    position: Vector,
    initialSpeed: number,
    thrustPower: number,
    angle: number,
    duration: number,
    color: number
  ) {
    angle -= 90;
    const velocity = this.scene.physics.velocityFromAngle(angle, initialSpeed);
    const thrust = this.scene.physics.velocityFromAngle(angle, thrustPower);
    const rocket = this.getRocket(position).setVelocity(velocity.x, velocity.y);
    const update = () => {
      this.updateRocket(rocket, thrust);
    };
    this.scene.events.on(events.scene.update, update);
    await this.delay(duration);
    thrust.set(0, 0);
    while (rocket.body.velocity.y < -4) {
      await nextUpdate(this.scene);
    }
    this.scene.events.off(events.scene.update, update);
    this.recycleRocket(rocket);
    this.flash(color);
    await this.explode(rocket.x, rocket.y, color);
  }

  private updateRocket(rocket: ImageWithDynamicBody, thrust: Vector) {
    const dragFactor = 0.02;
    const velocity = rocket.body.velocity;
    const velocityMagnitude = velocity.length();
    const drag = dragFactor * velocityMagnitude * velocityMagnitude;
    const acceleration = velocity.clone().normalize().scale(-drag).add(thrust);
    rocket.setAcceleration(acceleration.x, acceleration.y);
  }

  private updateParticle(particle: phaser.GameObjects.Particles.Particle) {
    const dragFactor = 0.05;
    const velocity = new Vector(particle.velocityX, particle.velocityY);
    const velocityMagnitude = velocity.length();
    const drag = dragFactor * velocityMagnitude * velocityMagnitude;
    const acceleration = velocity.normalize().scale(-drag);
    particle.accelerationX = acceleration.x;
    particle.accelerationY = acceleration.y;
  }
}
