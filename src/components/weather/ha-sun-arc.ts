import { css, LitElement, nothing, svg } from "lit";
import { customElement, property } from "lit/decorators";

const WIDTH = 300;
const HEIGHT = 130;
const BASELINE = 118;
const RADIUS = 140;
const CENTER_X = WIDTH / 2;

/**
 * The path of the sun across the sky between sunrise and sunset, with the sun
 * at its current position. During the night only the arc is shown.
 */
@customElement("ha-sun-arc")
export class HaSunArc extends LitElement {
  @property({ attribute: false }) public sunrise?: Date;

  @property({ attribute: false }) public sunset?: Date;

  @property({ attribute: false }) public now = new Date();

  private _point(progress: number): [number, number] {
    // 0 is sunrise on the left, 1 is sunset on the right
    const angle = Math.PI * (1 - progress);
    return [
      CENTER_X + RADIUS * Math.cos(angle),
      BASELINE - RADIUS * 0.75 * Math.sin(angle),
    ];
  }

  protected render() {
    const [startX, startY] = this._point(0);
    const [endX, endY] = this._point(1);
    const arc = `M ${startX} ${startY} A ${RADIUS} ${RADIUS * 0.75} 0 0 1 ${endX} ${endY}`;

    let progress: number | undefined;
    if (this.sunrise && this.sunset) {
      const total = this.sunset.getTime() - this.sunrise.getTime();
      const elapsed = this.now.getTime() - this.sunrise.getTime();
      if (total > 0 && elapsed >= 0 && elapsed <= total) {
        progress = elapsed / total;
      }
    }

    let traveled: ReturnType<typeof svg> | typeof nothing = nothing;
    let sun: ReturnType<typeof svg> | typeof nothing = nothing;
    if (progress !== undefined) {
      const [sunX, sunY] = this._point(progress);
      traveled = svg`<path
        class="traveled"
        d="M ${startX} ${startY} A ${RADIUS} ${RADIUS * 0.75} 0 0 1 ${sunX} ${sunY}"
      ></path>`;
      sun = svg`<circle class="sun" cx=${sunX} cy=${sunY} r="8"></circle>`;
    }

    return svg`
      <svg
        viewBox="0 -12 ${WIDTH} ${HEIGHT + 12}"
        role="img"
        aria-hidden="true"
        preserveAspectRatio="xMidYMid meet"
      >
        <path class="arc" d=${arc}></path>
        ${traveled}
        <line
          class="horizon"
          x1="0"
          y1=${BASELINE}
          x2=${WIDTH}
          y2=${BASELINE}
        ></line>
        ${sun}
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
    .arc {
      fill: none;
      stroke: var(--divider-color);
      stroke-width: 2;
      stroke-dasharray: 2 4;
    }
    .traveled {
      fill: none;
      stroke: var(--amber-color);
      stroke-width: 3;
      stroke-linecap: round;
    }
    .horizon {
      stroke: var(--divider-color);
      stroke-width: 1;
    }
    .sun {
      fill: var(--amber-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-sun-arc": HaSunArc;
  }
}
