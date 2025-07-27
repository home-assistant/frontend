import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import type { UiColorSelector } from "../../data/selector";
import "../ha-color-picker";
import type { HomeAssistant } from "../../types";

@customElement("ha-selector-ui_color")
export class HaSelectorUiColor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selector!: UiColorSelector;

  @property() public value?: string;

  @property() public label?: string;

  @property() public helper?: string;

  protected render() {
    return html`
      <ha-color-picker
        .label=${this.label}
        .hass=${this.hass}
        .value=${this.value}
        .helper=${this.helper}
        .includeNone=${this.selector.ui_color?.include_none}
        .includeState=${this.selector.ui_color?.include_state}
        .defaultColor=${this.selector.ui_color?.default_color}
        @value-changed=${this._valueChanged}
      ></ha-color-picker>
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    fireEvent(this, "value-changed", { value: ev.detail.value });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-ui_color": HaSelectorUiColor;
  }
}
