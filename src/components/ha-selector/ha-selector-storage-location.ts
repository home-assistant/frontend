import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { StorageLocationSelector } from "../../data/selector";
import { HomeAssistant } from "../../types";
import "../ha-mount-picker";

@customElement("ha-selector-storage_location")
export class HaStorageLocationSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public selector!: StorageLocationSelector;

  @property() public value?: any;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  protected render() {
    return html`<ha-mount-picker
      .hass=${this.hass}
      .value=${this.value}
      .label=${this.label}
      .helper=${this.helper}
      .disabled=${this.disabled}
      .required=${this.required}
      .usage=${this.selector.storage_location?.usage}
    ></ha-mount-picker>`;
  }

  static styles = css`
    ha-mount-picker {
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-storage-location": HaStorageLocationSelector;
  }
}
