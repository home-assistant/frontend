import "../ha-duration-input";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { DurationSelector } from "../../data/selector";
import { HomeAssistant } from "../../types";

@customElement("ha-selector-duration")
export class HaTimeDuration extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public selector!: DurationSelector;

  @property() public value?: string;

  @property() public label?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  protected render() {
    return html`
      <ha-duration-input
        .label=${this.label}
        .data=${this.value}
        .disabled=${this.disabled}
        .required=${this.required}
      ></ha-duration-input>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-duration": HaTimeDuration;
  }
}
