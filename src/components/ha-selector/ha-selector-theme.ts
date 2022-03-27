import "../../panels/lovelace/components/hui-theme-select-editor";
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
      <hui-theme-select-editor
        .hass=${this.hass}
        .value=${this.value}
        .label=${this.label}
      ></hui-theme-select-editor>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-theme": HaThemeSelector;
  }
}
