import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";

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

  protected render(): TemplateResult {
    const valuePrecentage = roundWithOneDecimal(
      getValueInPercentage(
        normalize(this.value, this.min, this.max),
        this.min,
        this.max
      )
    );

    return html`
      <svg width="100%">
        <g>
          <rect width="100%"></rect>
          <rect width="${valuePrecentage}%" rx="4"></rect>
        </g>
      </svg>
    `;
  }

  static get styles(): CSSResult {
    return css`
      :host {
        width: 100%;
      }
      rect:first-child {
        fill: var(--ha-bar-background-color, var(--secondary-background-color));
      }
      rect:last-child {
        fill: var(--ha-bar-primary-color, var(--primary-color));
      }
      svg {
        border-radius: var(--ha-bar-border-radius, 4px);
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
