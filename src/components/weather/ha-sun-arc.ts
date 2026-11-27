import type { PropertyValues } from "lit";
import { css, LitElement, nothing, svg } from "lit";
import { customElement, property } from "lit/decorators";
import { sunAltitude } from "../../common/astronomy/sun_moon";

const DAY_MS = 86400000;
const STEP_MS = 10 * 60000;
const DEG = 180 / Math.PI;

// The curve crosses the horizon line at sunrise and sunset, when the upper
// limb of the sun touches the horizon, including refraction.
const HORIZON_ALTITUDE = -0.833;
// Smallest range of each scale, so a low winter sun still has some height
const MIN_RANGE = 10;

const WIDTH = 300;
const PADDING = 8;
const ABOVE_HEIGHT = 80;
const BELOW_HEIGHT = 32;
const HORIZON_Y = PADDING + ABOVE_HEIGHT;
const HEIGHT = HORIZON_Y + BELOW_HEIGHT + PADDING;
const SUN_RADIUS = 6;

/**
 * The altitude of the sun from midnight to midnight, for the day of `now`.
 * The part of the day that has passed is filled. Above and below the horizon
 * each have their own scale.
 */
@customElement("ha-sun-arc")
export class HaSunArc extends LitElement {
  @property({ type: Number }) public latitude = 0;

  @property({ type: Number }) public longitude = 0;

  @property({ attribute: false }) public sunrise?: Date;

  @property({ attribute: false }) public sunset?: Date;

  @property({ attribute: false }) public now = new Date();

  // [milliseconds since midnight, altitude in degrees above the horizon]
  private _samples: [number, number][] = [];

  private _dayStart = 0;

  private _sampleKey?: string;

  protected willUpdate(changedProps: PropertyValues): void {
    if (
      !changedProps.has("now") &&
      !changedProps.has("latitude") &&
      !changedProps.has("longitude")
    ) {
      return;
    }
    const start = new Date(this.now);
    start.setHours(0, 0, 0, 0);
    const key = `${start.getTime()}|${this.latitude}|${this.longitude}`;
    if (key === this._sampleKey) {
      return;
    }
    this._sampleKey = key;
    this._dayStart = start.getTime();
    const samples: [number, number][] = [];
    for (let offset = 0; offset <= DAY_MS; offset += STEP_MS) {
      samples.push([
        offset,
        sunAltitude(
          new Date(this._dayStart + offset),
          this.latitude,
          this.longitude
        ) *
          DEG -
          HORIZON_ALTITUDE,
      ]);
    }
    this._samples = samples;
  }

  private _x(time: number): number {
    return (Math.min(Math.max(time, 0), DAY_MS) / DAY_MS) * WIDTH;
  }

  protected render() {
    if (!this._samples.length) {
      return nothing;
    }
    const altitudes = this._samples.map(([, alt]) => alt);
    const aboveRange = Math.max(MIN_RANGE, ...altitudes);
    const belowRange = Math.max(MIN_RANGE, ...altitudes.map((alt) => -alt));
    const y = (alt: number) =>
      alt >= 0
        ? HORIZON_Y - (alt / aboveRange) * ABOVE_HEIGHT
        : HORIZON_Y - (alt / belowRange) * BELOW_HEIGHT;

    const altitudeAt = (time: number): number => {
      const index = Math.min(
        Math.floor(time / STEP_MS),
        this._samples.length - 2
      );
      const [t0, a0] = this._samples[index];
      const [t1, a1] = this._samples[index + 1];
      return a0 + ((a1 - a0) * (time - t0)) / (t1 - t0);
    };

    const points = this._samples.map(
      ([time, alt]) => `${this._x(time)} ${y(alt)}`
    );
    const curve = `M ${points.join(" L ")}`;

    const elapsed = this.now.getTime() - this._dayStart;
    const nowX = this._x(elapsed);
    const nowAlt = altitudeAt(Math.min(Math.max(elapsed, 0), DAY_MS));
    const nowY = y(nowAlt);
    const passed = [
      ...this._samples
        .filter(([time]) => time < elapsed)
        .map(([time, alt]) => `${this._x(time)} ${y(alt)}`),
      `${nowX} ${nowY}`,
    ];
    const passedArea = `M 0 ${HORIZON_Y} L ${passed.join(" L ")} L ${nowX} ${HORIZON_Y} Z`;

    const marker = (date?: Date) =>
      date
        ? svg`<line
            class="marker"
            x1=${this._x(date.getTime() - this._dayStart)}
            x2=${this._x(date.getTime() - this._dayStart)}
            y1=${PADDING}
            y2=${HEIGHT - PADDING}
          ></line>`
        : nothing;

    return svg`
      <svg
        viewBox="0 0 ${WIDTH} ${HEIGHT}"
        aria-hidden="true"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <clipPath id="above">
            <rect x="0" y="0" width=${WIDTH} height=${HORIZON_Y}></rect>
          </clipPath>
          <clipPath id="below">
            <rect
              x="0"
              y=${HORIZON_Y}
              width=${WIDTH}
              height=${HEIGHT - HORIZON_Y}
            ></rect>
          </clipPath>
        </defs>
        <path class="passed-above" d=${passedArea} clip-path="url(#above)"></path>
        <path class="passed-below" d=${passedArea} clip-path="url(#below)"></path>
        ${marker(this.sunrise)} ${marker(this.sunset)}
        <line
          class="horizon"
          x1="0"
          y1=${HORIZON_Y}
          x2=${WIDTH}
          y2=${HORIZON_Y}
        ></line>
        <path class="curve" d=${curve}></path>
        <circle
          class=${nowAlt >= 0 ? "sun" : "sun below"}
          cx=${nowX}
          cy=${nowY}
          r=${SUN_RADIUS}
        ></circle>
      </svg>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }
    svg {
      display: block;
      width: 100%;
      height: auto;
      overflow: visible;
    }
    .passed-above {
      fill: var(--state-sun-above_horizon-color);
      fill-opacity: 0.3;
    }
    .passed-below {
      fill: var(--state-sun-below_horizon-color);
      fill-opacity: 0.5;
    }
    .marker,
    .horizon {
      stroke: var(--divider-color);
      stroke-width: 1px;
      vector-effect: non-scaling-stroke;
    }
    .curve {
      fill: none;
      stroke: var(--secondary-text-color);
      stroke-opacity: 0.5;
      stroke-width: 1px;
      vector-effect: non-scaling-stroke;
    }
    .sun {
      fill: var(--state-sun-above_horizon-color);
    }
    .sun.below {
      fill: var(--ha-card-background, var(--card-background-color));
      stroke: var(--state-sun-below_horizon-color);
      stroke-width: 2px;
      vector-effect: non-scaling-stroke;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-sun-arc": HaSunArc;
  }
}
