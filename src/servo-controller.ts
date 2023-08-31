type RingServoConfig = {
  name: string;
  positions: {
    push: number;
    reset: number;
  };
};

export type Config = {
  url: string;
  ringServo: RingServoConfig;
};

export class ServoController {
  private url: string;

  private ringServo: RingServoConfig;

  constructor({ url, ringServo }: Config) {
    for (const [name, position] of Object.entries(ringServo.positions)) {
      if (position < 0 || position > 1) {
        throw new Error(
          `servo position with name '${name}' must be in range [0, 1]`
        );
      }
    }
    this.url = url;
    this.ringServo = ringServo;
  }

  public moveRingServo(positionName: keyof RingServoConfig["positions"]) {
    return this.request({
      servo: this.ringServo.name,
      move: this.ringServo.positions[positionName].toString(),
    });
  }

  private async request(params?: { [key: string]: string }) {
    const url = new URL(this.url);
    if (params !== undefined) {
      url.search = new URLSearchParams(params).toString();
    }
    return fetch(url);
  }
}
