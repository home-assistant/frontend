import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import type { TimeSelector } from "../../data/selector";
import type { HomeAssistant } from "../../types";
import "../ha-date-time-input";
import "../ha-date-time-multiple-input";

@customElement("ha-selector-time")
export class HaTimeSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property({ attribute: false }) public selector!: TimeSelector;

  @property() public value?: any;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  protected render() {
    if (!this.selector.time?.multiple) {
      return html`
        <ha-date-time-input
          .hass=${this.hass}
          .value=${this.value}
          .label=${this.label}
          .locale=${this.hass.locale}
          .disabled=${this.disabled}
          .required=${this.required}
          .helper=${this.helper}
          enable-time
          enable-second
        ></ha-date-time-input>
      `;
    }
    return html`
      <ha-date-time-multiple-input
        .hass=${this.hass}
        .value=${this.value}
        .label=${this.label}
        .locale=${this.hass.locale}
        .disabled=${this.disabled}
        .required=${this.required}
        .helper=${this.helper}
        enable-time
        enable-second
      ></ha-date-time-multiple-input>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-time": HaTimeSelector;
  }
}
