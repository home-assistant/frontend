import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import type { UiDateFormatPartsSelector } from "../../data/selector";
import type { HomeAssistant } from "../../types";
import "../ha-date-format-parts-picker";

@customElement("ha-selector-ui_date_format_parts")
export class HaSelectorUiDateFormatParts extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selector!: UiDateFormatPartsSelector;

  @property() public value?: string | string[];

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  protected render() {
    return html`
      <ha-date-format-parts-picker
        .hass=${this.hass}
        .value=${this.value}
        .label=${this.label}
        .helper=${this.helper}
        .disabled=${this.disabled}
        .required=${this.required}
      ></ha-date-format-parts-picker>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-ui_date_format_parts": HaSelectorUiDateFormatParts;
  }
}
