import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import type { HomeAssistant } from "../../types";
import type { DateSelector } from "../../data/selector";
import { fireEvent } from "../../common/dom/fire_event";
import "../ha-date-input";

@customElement("ha-selector-date")
export class HaDateSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public selector!: DateSelector;

  @property() public value?: string;

  @property() public label?: string;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  protected render() {
    return html`
      <ha-date-input
        .label=${this.label}
        .locale=${this.hass.locale}
        .disabled=${this.disabled}
        .value=${this.value}
        @value-changed=${this._valueChanged}
      >
      </ha-date-input>
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    fireEvent(this, "value-changed", { value: ev.detail.value });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-date": HaDateSelector;
  }
}
