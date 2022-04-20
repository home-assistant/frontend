import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import type { DurationSelector } from "../../data/selector";
import type { HomeAssistant } from "../../types";
import "../ha-duration-input";

@customElement("ha-selector-duration")
export class HaTimeDuration extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public selector!: DurationSelector;

  @property() public value?: string;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  protected render() {
    return html`
      <ha-duration-input
        .label=${this.label}
        .helper=${this.helper}
        .data=${this.value}
        .disabled=${this.disabled}
        .required=${this.required}
        .enableDay=${this.selector.duration.enable_day}
      ></ha-duration-input>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-duration": HaTimeDuration;
  }
}
