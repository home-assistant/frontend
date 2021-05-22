import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { AddonSelector } from "../../data/selector";
import { HomeAssistant } from "../../types";
import "../ha-addon-picker";

@customElement("ha-selector-addon")
export class HaAddonSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public selector!: AddonSelector;

  @property() public value?: any;

  @property() public label?: string;

  protected render() {
    return html`<ha-addon-picker
      .hass=${this.hass}
      .value=${this.value}
      .label=${this.label}
      allow-custom-entity
    ></ha-addon-picker>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-addon": HaAddonSelector;
  }
}
