import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators";
import type { AreasDisplaySelector } from "../../data/selector";
import type { HomeAssistant } from "../../types";
import "../ha-areas-display-editor";

@customElement("ha-selector-areas_display")
export class HaAreasDisplaySelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selector!: AreasDisplaySelector;

  @property() public value?: any;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  protected render() {
    return html`
      <ha-areas-display-editor
        .hass=${this.hass}
        .value=${this.value}
        .label=${this.label}
        .helper=${this.helper}
        .disabled=${this.disabled}
        .required=${this.required}
      ></ha-areas-display-editor>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-areas_display": HaAreasDisplaySelector;
  }
}
