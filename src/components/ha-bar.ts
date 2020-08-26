import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";

@customElement("ha-bar")
export class HaBar extends LitElement {
  @property({ type: Number, attribute: "max-value" }) public maxValue = 100;

  @property({ type: Number }) public value!: number;

  @property({ type: Number }) public target!: number; // Number between 0 and 100

  protected render(): TemplateResult {
    const valuePrecentage = this._calculateValuePrecentage();

    return html`
      <slot></slot>
      <div class="bar">
        <div class="value">
          ${valuePrecentage}%
        </div>
        <svg width="150">
          <g>
            <rect width="100%" height="12"></rect>
            <rect
              class="${classMap({
                "target-reached": this.target && valuePrecentage >= this.target,
              })}"
              width="${valuePrecentage}%"
              height="12"
              rx="4"
            ></rect>
          </g>
        </svg>
      </div>
    `;
  }

  private _calculateValuePrecentage(): number {
    if (isNaN(this.value)) {
      // Not a number, return 0
      return 0;
    }
    if (this.maxValue === 100) {
      return Math.round(this.value * 10) / 10;
    }
    if (this.value >= this.maxValue) {
      // The given value is hihger than the max value
      return 100;
    }

    return Math.round((this.value / this.maxValue) * 100 * 10) / 10;
  }

  static get styles(): CSSResult {
    return css`
      :host {
        align-items: center;
        display: flex;
        justify-content: space-between;
        line-height: 12px;
        min-height: 12px;
        width: 100%;
      }
      slot {
        display: block;
        max-width: calc(100% - 164px);
      }
      .bar {
        display: flex;
        max-width: calc(100% - 8px);
      }
      .value {
        height: 12px;
        line-height: 12px;
        margin-left: 6px;
        margin-right: 2px;
        text-align: end;
      }
      rect:first-child {
        fill: var(--ha-bar-background-color, var(--secondary-background-color));
      }
      rect:last-child {
        fill: var(--ha-bar-primary-color, var(--primary-color));
      }
      rect:last-child.target-reached {
        fill: var(--ha-bar-target-color, var(--error-color));
      }
      svg {
        border-radius: 4px;
        height: 12px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-bar": HaBar;
  }
}
