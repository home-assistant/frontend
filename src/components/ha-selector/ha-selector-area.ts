import { customElement, html, LitElement, property } from "lit-element";
import { HomeAssistant } from "../../types";
import { AreaSelector } from "../../data/selector";
import "../ha-area-picker";

@customElement("ha-selector-area")
export class HaAreaSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public selector!: AreaSelector;

  @property() public value?: any;

  @property() public label?: string;

  protected render() {
    return html`<ha-area-picker
      .hass=${this.hass}
      .value=${this.value}
      .label=${this.label}
      no-add
    ></ha-area-picker>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-area": HaAreaSelector;
  }
}
