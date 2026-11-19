import { css, LitElement, nothing, svg } from "lit";
import { customElement, property } from "lit/decorators";

/**
 * A compass with an arrow that points where the wind blows to, and an
 * optional value (like the Beaufort number) in the middle.
 */
@customElement("ha-wind-compass")
export class HaWindCompass extends LitElement {
  /** Direction the wind comes from, in degrees */
  @property({ type: Number }) public bearing?: number;

  @property() public value?: string;

  @property() public unit?: string;

  /** Localized labels for north, east, south and west */
  @property({ attribute: false }) public labels: string[] = [
    "N",
    "E",
    "S",
    "W",
  ];

  protected render() {
    const [north, east, south, west] = this.labels;
    return svg`
      <svg viewBox="0 0 100 100" role="img" aria-hidden="true">
        <circle class="ring" cx="50" cy="50" r="40"></circle>
        <text class="north" x="50" y="7" text-anchor="middle" dominant-baseline="hanging">${north}</text>
        <text x="94" y="50" text-anchor="end" dominant-baseline="middle">${east}</text>
        <text x="50" y="93" text-anchor="middle">${south}</text>
        <text x="6" y="50" dominant-baseline="middle">${west}</text>
        ${
          this.bearing !== undefined
            ? svg`
              <g transform="rotate(${this.bearing} 50 50)">
                <line class="arrow" x1="50" y1="16" x2="50" y2="80"></line>
                <path class="head" d="M 50 86 L 44 74 L 56 74 Z"></path>
                <circle class="tail" cx="50" cy="16" r="4"></circle>
              </g>
            `
            : nothing
        }
        ${
          this.value !== undefined
            ? svg`
              <circle class="center" cx="50" cy="50" r="15"></circle>
              <text class="value" x="50" y="49" text-anchor="middle">${this.value}</text>
              ${
                this.unit
                  ? svg`<text class="unit" x="50" y="60" text-anchor="middle">${this.unit}</text>`
                  : nothing
              }
            `
            : nothing
        }
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
      height: 100%;
    }
    .ring {
      fill: none;
      stroke: var(--divider-color);
      stroke-width: 6;
      stroke-dasharray: 1 3;
    }
    text {
      font-family: var(--ha-font-family-body);
      font-size: 10px;
      fill: var(--secondary-text-color);
    }
    text.north {
      font-weight: var(--ha-font-weight-bold);
      fill: var(--primary-text-color);
    }
    .arrow {
      stroke: var(--primary-text-color);
      stroke-width: 2.5;
      stroke-linecap: round;
    }
    .head,
    .tail {
      fill: var(--primary-text-color);
    }
    .center {
      fill: var(--card-background-color);
    }
    .value {
      font-size: 14px;
      font-weight: var(--ha-font-weight-medium);
      fill: var(--primary-text-color);
    }
    .unit {
      font-size: 8px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-wind-compass": HaWindCompass;
  }
}
