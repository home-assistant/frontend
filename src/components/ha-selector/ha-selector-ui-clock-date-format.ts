import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import type { UiClockDateFormatSelector } from "../../data/selector";
import type { HomeAssistant } from "../../types";
import "../ha-clock-date-format-picker";

@customElement("ha-selector-ui_clock_date_format")
export class HaSelectorUiClockDateFormat extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selector!: UiClockDateFormatSelector;

  @property() public value?: string | string[];

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  protected render() {
    return html`
      <ha-clock-date-format-picker
        .hass=${this.hass}
        .value=${this.value}
        .label=${this.label}
        .helper=${this.helper}
        .disabled=${this.disabled}
        .required=${this.required}
      ></ha-clock-date-format-picker>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-ui_clock_date_format": HaSelectorUiClockDateFormat;
  }
}
