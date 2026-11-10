import type { CoverWave } from "./shapes/shared";

const FRAME_DURATION = 16.7;
const REST_VELOCITY = 0.015;

export class WaveMotion implements CoverWave {
  public velocity = 0;

  public phase = 0;

  private _position = 0;

  public reset(position: number): void {
    this.jumpTo(position);
    this.phase = 0;
  }

  public jumpTo(position: number): void {
    this._position = position;
    this.velocity = 0;
  }

  public moveTo(position: number, dt: number): boolean {
    const frames = Math.max(0.01, (dt * 1000) / FRAME_DURATION);
    const keep = 0.9 ** frames;
    const instant = (position - this._position) / frames;
    this.velocity = this.velocity * keep + instant * (1 - keep);
    if (Math.abs(this.velocity) < REST_VELOCITY && Math.abs(instant) < 0.001) {
      this.velocity = 0;
    }
    this._position = position;
    if (!this.velocity) {
      return false;
    }
    this.phase += (0.06 + Math.abs(this.velocity) * 0.03) * frames;
    return true;
  }
}
