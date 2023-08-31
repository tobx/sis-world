export type Dimensions = { width: number; height: number };

export class Ema {
  public value: number;

  constructor(private smoothingFactor: number, initialValue: number) {
    this.value = initialValue;
  }

  public update(newValue: number) {
    this.value =
      this.smoothingFactor * newValue + (1 - this.smoothingFactor) * this.value;
  }
}
