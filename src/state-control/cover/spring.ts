import { clamp } from "../../common/number/clamp";

const STEP = 0.016;
const REST_DISTANCE = 0.05;
const REST_VELOCITY = 0.5;

export interface SpringOptions {
  stiffness?: number;
  damping?: number;
}

export class PercentSpring {
  public value = 0;

  public velocity = 0;

  public jumpTo(value: number): boolean {
    this.velocity = 0;
    if (this.value === value) {
      return false;
    }
    this.value = value;
    return true;
  }

  public moveTo(
    goal: number,
    dt: number,
    { stiffness = 7, damping = 1 }: SpringOptions = {}
  ): boolean {
    if (
      Math.abs(goal - this.value) < REST_DISTANCE &&
      Math.abs(this.velocity) < REST_VELOCITY
    ) {
      return this.jumpTo(goal);
    }
    for (let left = dt; left > 0; left -= STEP) {
      const step = Math.min(STEP, left);
      this.velocity +=
        (stiffness * stiffness * (goal - this.value) -
          2 * damping * stiffness * this.velocity) *
        step;
      this.value += this.velocity * step;
      if (this.value < 0 || this.value > 100) {
        this.value = clamp(this.value, 0, 100);
        this.velocity = 0;
      }
    }
    return true;
  }
}
