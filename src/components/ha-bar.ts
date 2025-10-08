import type { TemplateResult } from "lit";
import { css, LitElement, svg } from "lit";
import { customElement, property } from "lit/decorators";
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

    return svg`
      <svg>
        <g>
          <rect/>
          <rect width="${valuePrecentage}%"/>
        </g>
      </svg>
    `;
  }

  static styles = css`
    rect {
      height: 100%;
    }
    rect:first-child {
      width: 100%;
      fill: var(--ha-bar-background-color, var(--secondary-background-color));
    }
    rect:last-child {
      fill: var(--ha-bar-primary-color, var(--primary-color));
    }
    svg {
      border-radius: var(--ha-bar-border-radius, var(--ha-border-radius-sm));
      height: 12px;
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-bar": HaBar;
  }
}
