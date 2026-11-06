import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";

export interface LevelScaleSegment {
  /** Upper limit of this segment, in the same unit as the value */
  to: number;
  color: string;
}

/**
 * A scale with colored segments and a marker for the current value, for
 * values like the UV index, air quality or air pressure.
 */
@customElement("ha-level-scale")
export class HaLevelScale extends LitElement {
  @property({ type: Number }) public min = 0;

  @property({ type: Number }) public max = 100;

  @property({ type: Number }) public value = 0;

  /** Without segments the scale is a single neutral track. */
  @property({ attribute: false }) public segments: LevelScaleSegment[] = [];

  @property() public label?: string;

  private _percentage(value: number): number {
    const span = this.max - this.min;
    if (span <= 0) {
      return 0;
    }
    return Math.min(100, Math.max(0, ((value - this.min) / span) * 100));
  }

  private _background(): string {
    if (!this.segments.length) {
      return "var(--ha-color-fill-neutral-quiet-resting)";
    }
    let start = 0;
    const stops = this.segments.map((segment) => {
      const end = this._percentage(segment.to);
      const stop = `${segment.color} ${start}% ${end}%`;
      start = end;
      return stop;
    });
    return `linear-gradient(to right, ${stops.join(", ")})`;
  }

  protected render() {
    return html`
      <div
        class="track"
        role="meter"
        aria-label=${this.label ?? ""}
        aria-valuemin=${this.min}
        aria-valuemax=${this.max}
        aria-valuenow=${this.value}
        style=${styleMap({ background: this._background() })}
      >
        <div
          class="marker"
          style=${styleMap({ left: `${this._percentage(this.value)}%` })}
        ></div>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }
    .track {
      position: relative;
      height: 4px;
      border-radius: var(--ha-border-radius-pill);
    }
    .marker {
      position: absolute;
      top: 50%;
      width: 10px;
      height: 10px;
      border-radius: var(--ha-border-radius-circle);
      background-color: var(--primary-text-color);
      border: 2px solid var(--card-background-color);
      transform: translate(-50%, -50%);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-level-scale": HaLevelScale;
  }
}
