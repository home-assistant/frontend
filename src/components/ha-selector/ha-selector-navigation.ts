import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { NavigationSelector } from "../../data/selector";
import { HomeAssistant } from "../../types";
import "../ha-navigate-picker";

@customElement("ha-selector-navigation")
export class HaNavigationSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public selector!: NavigationSelector;

  @property() public value?: string;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  protected render() {
    return html`
      <ha-navigate-picker
        .hass=${this.hass}
        .label=${this.label}
        .value=${this.value}
        .required=${this.required}
        .disabled=${this.disabled}
        .helper=${this.helper}
        @value-changed=${this._valueChanged}
      ></ha-navigate-picker>
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    fireEvent(this, "value-changed", { value: ev.detail.value });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-navigation": HaNavigationSelector;
  }
}
