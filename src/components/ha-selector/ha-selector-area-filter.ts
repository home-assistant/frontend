import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators";
import type { AreaFilterSelector } from "../../data/selector";
import { HomeAssistant } from "../../types";
import "../ha-area-filter";

@customElement("ha-selector-area_filter")
export class HaAreaFilterSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public selector!: AreaFilterSelector;

  @property() public value?: any;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  protected render() {
    return html`
      <ha-area-filter
        .hass=${this.hass}
        .value=${this.value}
        .label=${this.label}
        .helper=${this.helper}
        .disabled=${this.disabled}
        .required=${this.required}
      ></ha-area-filter>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-area_filter": HaAreaFilterSelector;
  }
}
