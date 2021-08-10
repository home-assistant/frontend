import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { TimeSelector } from "../../data/selector";
import { HomeAssistant } from "../../types";
import "../ha-time-input";

@customElement("ha-selector-time")
export class HaTimeSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public selector!: TimeSelector;

  @property() public value?: string;

  @property() public label?: string;

  @property({ type: Boolean }) public disabled = false;

  protected render() {
    return html`
      <ha-time-input
        .label=${this.label}
        .value=${this.value}
        .locale=${this.hass.locale}
        .disabled=${this.disabled}
        hide-label
        enable-second
      ></ha-time-input>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-time": HaTimeSelector;
  }
}
