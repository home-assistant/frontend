import { css, html, LitElement } from "lit";
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

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  protected render() {
    return html`<ha-addon-picker
      .hass=${this.hass}
      .value=${this.value}
      .label=${this.label}
      .helper=${this.helper}
      .disabled=${this.disabled}
      .required=${this.required}
      allow-custom-entity
    ></ha-addon-picker>`;
  }

  static styles = css`
    ha-addon-picker {
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-addon": HaAddonSelector;
  }
}
