import "../ha-theme-picker";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import type { HomeAssistant } from "../../types";
import type { ThemeSelector } from "../../data/selector";

@customElement("ha-selector-theme")
export class HaThemeSelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selector!: ThemeSelector;

  @property() public value?: string;

  @property() public label?: string;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  protected render() {
    return html`
      <ha-theme-picker
        .hass=${this.hass}
        .value=${this.value}
        .label=${this.label}
      ></ha-theme-picker>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-theme": HaThemeSelector;
  }
}
