import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import "./ha-control-slider";
import "./ha-control-number-buttons";
import type { FrontendLocaleData } from "../data/translation";

@customElement("ha-control-number-input")
export class HaControlNumberInput extends LitElement {
  @property({ attribute: false }) public locale?: FrontendLocaleData;

  @property({ type: Boolean, reflect: true }) disabled = false;

  @property() public label?: string;

  @property({ type: Number }) public step?: number;

  @property({ type: Number }) public value?: number;

  @property({ type: Number }) public min?: number;

  @property({ type: Number }) public max?: number;

  @property() public unit?: string;

  @property({ attribute: "input-style" })
  public inputStyle?: "buttons" | "slider";

  protected render(): TemplateResult {
    if (this.inputStyle === "buttons") {
      return html`
        <ha-control-number-buttons
          .value=${this.value}
          .min=${this.min}
          .max=${this.max}
          .step=${this.step}
          .disabled=${this.disabled}
          .unit=${this.unit}
          .locale=${this.locale}
        ></ha-control-number-buttons>
      `;
    }

    return html`
      <ha-control-slider
        .value=${this.value}
        .min=${this.min}
        .max=${this.max}
        .step=${this.step}
        .disabled=${this.disabled}
        .unit=${this.unit}
        .locale=${this.locale}
      ></ha-control-slider>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-control-number-input": HaControlNumberInput;
  }
}
