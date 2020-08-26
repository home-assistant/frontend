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

import {
  getValueInPercentage,
  normalize,
  roundWithOneDecimal,
} from "../util/calculate";

@customElement("ha-bar")
export class HaBar extends LitElement {
  @property({ type: Number }) public min = 0;

  @property({ type: Number }) public max = 100;

  @property({ type: Number }) public value!: number;

  @property({ type: Number }) public target?: number; // Number between 0 and 100

  protected render(): TemplateResult {
    const valuePrecentage = roundWithOneDecimal(
      getValueInPercentage(
        normalize(this.value, this.min, this.max),
        this.min,
        this.max
      )
    );

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
                "target-reached":
                  this.target !== undefined && valuePrecentage >= this.target,
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
