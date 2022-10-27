import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { ConfigEntrySelector } from "../../data/selector";
import { HomeAssistant } from "../../types";
import "../ha-config-entry-picker";

@customElement("ha-selector-config_entry")
export class HaConfigEntrySelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selector!: ConfigEntrySelector;

  @property() public value?: any;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  protected render() {
    return html`<ha-config-entry-picker
      .hass=${this.hass}
      .value=${this.value}
      .label=${this.label}
      .helper=${this.helper}
      .disabled=${this.disabled}
      .required=${this.required}
      .integration=${this.selector.config_entry?.integration}
      allow-custom-entity
    ></ha-config-entry-picker>`;
  }

  static styles = css`
    ha-config-entry-picker {
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-config_entry": HaConfigEntrySelector;
  }
}
