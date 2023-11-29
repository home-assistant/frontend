import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import type { DateSelector } from "../../data/selector";
import type { HomeAssistant } from "../../types";
import "../ha-date-input";

@customElement("ha-selector-date")
export class HaDateSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public selector!: DateSelector;

  @property() public value?: string;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  protected render() {
    return html`
      <ha-date-input
        .label=${this.label}
        .locale=${this.hass.locale}
        .disabled=${this.disabled}
        .value=${typeof this.value === "string" ? this.value : undefined}
        .required=${this.required}
        .helper=${this.helper}
      >
      </ha-date-input>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-date": HaDateSelector;
  }
}
