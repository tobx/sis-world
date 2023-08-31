export class Action {
  private active = false;

  private complete = false;

  private _executionCount = 0;

  constructor(private func: (action: Action) => void | Promise<void>) {}

  public get executionCount() {
    return this._executionCount;
  }

  public get isActive() {
    return this.active;
  }

  public get isComplete() {
    return this.complete;
  }

  public isReady() {
    return !this.active && !this.complete;
  }

  public reset() {
    this.complete = false;
  }

  public setComplete() {
    this.complete = true;
  }

  public async execute(
    options: {
      executeBefore?: () => void | Promise<void>;
    } = {}
  ) {
    this.active = true;
    if (options.executeBefore !== undefined) {
      await options.executeBefore();
    }
    await this.func(this);
    this.active = false;
    this.complete = true;
    this._executionCount++;
  }
}
