import type {
  ReactiveController,
  ReactiveControllerHost,
} from "@lit/reactive-element/reactive-controller";
import type { HaSlider } from "../../components/ha-slider";
import type { MediaPlayerEntity } from "../../data/media-player";
import { formatMediaTime, getCurrentProgress } from "../../data/media-player";

const PENDING_SEEK_TIMEOUT_MS = 5000;
const PENDING_SEEK_TOLERANCE_S = 2;
const PROGRESS_INTERVAL_MS = 1000;

export interface MediaProgressControllerOptions {
  getStateObj: () => MediaPlayerEntity | undefined;
  getSlider: () => HaSlider | undefined;
}

/**
 * Drives a media progress slider: ticks it while the media plays, holds it
 * on the target after a seek until the player state catches up, and leaves
 * it alone while the user drags it. The controller owns the slider value;
 * the host must not bind `.value` and reads `progress` for position text.
 */
export class MediaProgressController implements ReactiveController {
  /** Current position in media seconds, pending seek included. */
  public progress?: number;

  private _host: ReactiveControllerHost;

  private _options: MediaProgressControllerOptions;

  private _interval?: number;

  private _pendingPosition?: number;

  private _pendingSince = 0;

  constructor(
    host: ReactiveControllerHost,
    options: MediaProgressControllerOptions
  ) {
    this._host = host;
    this._options = options;
    host.addController(this);
  }

  public hostUpdate(): void {
    this._computeProgress();
  }

  public hostUpdated(): void {
    this._writeSlider();
    this._syncInterval();
  }

  public hostDisconnected(): void {
    this._stopInterval();
  }

  /**
   * Report a seek so the displayed position moves to the target immediately
   * instead of jumping back until the player state reflects the seek.
   */
  public seek(position: number): void {
    this._pendingPosition = position;
    this._pendingSince = Date.now();
    this._tick();
  }

  private _tick(): void {
    this._computeProgress();
    this._writeSlider();
    this._host.requestUpdate();
  }

  private _syncInterval(): void {
    const stateObj = this._options.getStateObj();
    if (
      stateObj?.state === "playing" &&
      stateObj.attributes.media_duration &&
      stateObj.attributes.media_position !== undefined
    ) {
      if (!this._interval) {
        this._interval = window.setInterval(
          () => this._tick(),
          PROGRESS_INTERVAL_MS
        );
      }
    } else {
      this._stopInterval();
    }
  }

  private _stopInterval(): void {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = undefined;
    }
  }

  private _computeProgress(): void {
    const stateObj = this._options.getStateObj();
    if (
      !stateObj ||
      !stateObj.attributes.media_duration ||
      stateObj.attributes.media_position === undefined
    ) {
      this.progress = undefined;
      return;
    }
    this.progress = this._applyPendingSeek(
      getCurrentProgress(stateObj),
      stateObj.state === "playing",
      stateObj.attributes.media_duration
    );
  }

  private _applyPendingSeek(
    current: number,
    playing: boolean,
    duration: number
  ): number {
    if (this._pendingPosition === undefined) {
      return current;
    }
    const elapsedMs = Date.now() - this._pendingSince;
    const target = Math.min(
      this._pendingPosition + (playing ? elapsedMs / 1000 : 0),
      duration
    );
    if (
      elapsedMs > PENDING_SEEK_TIMEOUT_MS ||
      Math.abs(current - target) <= PENDING_SEEK_TOLERANCE_S
    ) {
      this._pendingPosition = undefined;
      return current;
    }
    return target;
  }

  private _writeSlider(): void {
    const slider = this._options.getSlider();
    if (!slider) {
      return;
    }
    slider.valueFormatter = formatMediaTime;
    if (slider.matches(":state(dragging)")) {
      return;
    }
    slider.value = this.progress ?? 0;
  }
}
