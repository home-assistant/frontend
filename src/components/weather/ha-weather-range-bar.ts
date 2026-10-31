import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";

/**
 * A horizontal bar that shows a range (like the low and high temperature of a
 * day) within a larger scale (like the lowest and highest of the week).
 */
@customElement("ha-weather-range-bar")
export class HaWeatherRangeBar extends LitElement {
  /** Lowest value of the whole scale */
  @property({ type: Number }) public min = 0;

  /** Highest value of the whole scale */
  @property({ type: Number }) public max = 100;

  @property({ type: Number }) public low = 0;

  @property({ type: Number }) public high = 0;

  /** Optional marker, like the temperature right now */
  @property({ type: Number }) public current?: number;

  private _percentage(value: number): number {
    const span = this.max - this.min;
    if (span <= 0) {
      return 0;
    }
    return Math.min(100, Math.max(0, ((value - this.min) / span) * 100));
  }

  protected render() {
    const left = this._percentage(Math.min(this.low, this.high));
    const right = 100 - this._percentage(Math.max(this.low, this.high));
    return html`
      <div class="track">
        <div
          class="range"
          style=${styleMap({ left: `${left}%`, right: `${right}%` })}
        ></div>
        ${
          this.current !== undefined
            ? html`<div
                class="current"
                style=${styleMap({ left: `${this._percentage(this.current)}%` })}
              ></div>`
            : nothing
        }
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
      --range-bar-height: 6px;
    }
    .track {
      position: relative;
      height: var(--range-bar-height);
      border-radius: var(--ha-border-radius-pill);
      background-color: var(--ha-color-fill-neutral-quiet-resting);
    }
    .range {
      position: absolute;
      top: 0;
      bottom: 0;
      min-width: var(--range-bar-height);
      border-radius: inherit;
      background: var(
        --range-bar-color,
        linear-gradient(to right, var(--light-blue-color), var(--amber-color))
      );
    }
    .current {
      position: absolute;
      top: 50%;
      width: calc(var(--range-bar-height) + 2px);
      height: calc(var(--range-bar-height) + 2px);
      border-radius: var(--ha-border-radius-circle);
      background-color: var(--primary-text-color);
      border: 2px solid var(--card-background-color);
      transform: translate(-50%, -50%);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-weather-range-bar": HaWeatherRangeBar;
  }
}
