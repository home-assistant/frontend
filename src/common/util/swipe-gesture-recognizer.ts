export interface SwipeGestureResult {
  velocity: number;
  delta: number;
  isSwipe: boolean;
  isDownwardSwipe: boolean;
}

export interface SwipeGestureConfig {
  velocitySwipeThreshold?: number;
  movementTimeThreshold?: number;
}

const VELOCITY_SWIPE_THRESHOLD = 0.5; // px/ms
const MOVEMENT_TIME_THRESHOLD = 100; // ms

/**
 * Recognizes swipe gestures and calculates velocity for touch interactions.
 * Tracks touch movement and provides velocity-based and position-based gesture detection.
 */
export class SwipeGestureRecognizer {
  private _startY = 0;

  private _delta = 0;

  private _startTime = 0;

  private _lastY = 0;

  private _lastTime = 0;

  private _velocityThreshold: number;

  private _movementTimeThreshold: number;

  constructor(config: SwipeGestureConfig = {}) {
    this._velocityThreshold =
      config.velocitySwipeThreshold ?? VELOCITY_SWIPE_THRESHOLD; // px/ms
    this._movementTimeThreshold =
      config.movementTimeThreshold ?? MOVEMENT_TIME_THRESHOLD; // ms
  }

  /**
   * Initialize gesture tracking with starting touch position
   */
  public start(clientY: number): void {
    const now = Date.now();
    this._startY = clientY;
    this._startTime = now;
    this._lastY = clientY;
    this._lastTime = now;
    this._delta = 0;
  }

  /**
   * Update gesture state during movement
   * Returns the current delta (negative when dragging down)
   */
  public move(clientY: number): number {
    const now = Date.now();
    this._delta = this._startY - clientY;
    this._lastY = clientY;
    this._lastTime = now;
    return this._delta;
  }

  /**
   * Calculate final gesture result when touch ends
   */
  public end(): SwipeGestureResult {
    const velocity = this.getVelocity();
    const hasSignificantVelocity = Math.abs(velocity) > this._velocityThreshold;

    return {
      velocity,
      delta: this._delta,
      isSwipe: hasSignificantVelocity,
      isDownwardSwipe: velocity > 0,
    };
  }

  /**
   * Get current drag delta (negative when dragging down)
   */
  public getDelta(): number {
    return this._delta;
  }

  /**
   * Calculate velocity based on recent movement
   * Returns 0 if no recent movement detected
   * Positive velocity means downward swipe
   */
  public getVelocity(): number {
    const now = Date.now();
    const timeSinceLastMove = now - this._lastTime;

    // Only consider velocity if the last movement was recent
    if (timeSinceLastMove >= this._movementTimeThreshold) {
      return 0;
    }

    const timeDelta = this._lastTime - this._startTime;
    return timeDelta > 0 ? (this._lastY - this._startY) / timeDelta : 0;
  }

  /**
   * Reset all tracking state
   */
  public reset(): void {
    this._startY = 0;
    this._delta = 0;
    this._startTime = 0;
    this._lastY = 0;
    this._lastTime = 0;
  }
}
