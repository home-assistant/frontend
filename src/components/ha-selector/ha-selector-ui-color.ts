import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { ActionConfig } from "../../data/lovelace";
import { UiColorSelector } from "../../data/selector";
import "../../panels/lovelace/components/hui-color-picker";
import { HomeAssistant } from "../../types";

@customElement("ha-selector-ui_color")
export class HaSelectorUiColor extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public selector!: UiColorSelector;

  @property() public value?: ActionConfig;

  @property() public label?: string;

  @property() public helper?: string;

  protected render() {
    return html`
      <hui-color-picker
        .label=${this.label}
        .hass=${this.hass}
        .value=${this.value}
        .helper=${this.helper}
        @value-changed=${this._valueChanged}
      ></hui-color-picker>
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    fireEvent(this, "value-changed", { value: ev.detail.value });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-ui-color": HaSelectorUiColor;
  }
}
