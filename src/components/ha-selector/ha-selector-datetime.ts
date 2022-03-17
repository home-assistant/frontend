import { css, html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators";
import type { HomeAssistant } from "../../types";
import type { DateTimeSelector } from "../../data/selector";
import type { HaDateInput } from "../ha-date-input";
import type { HaTimeInput } from "../ha-time-input";
import { fireEvent } from "../../common/dom/fire_event";
import "../ha-date-input";
import "../ha-time-input";

@customElement("ha-selector-datetime")
export class HaDateTimeSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public selector!: DateTimeSelector;

  @property() public value?: string;

  @property() public label?: string;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @query("ha-date-input") private _dateInput!: HaDateInput;

  @query("ha-time-input") private _timeInput!: HaTimeInput;

  protected render() {
    const values = this.value?.split(" ");
    return html`
      <ha-date-input
        .label=${this.label}
        .locale=${this.hass.locale}
        .disabled=${this.disabled}
        .value=${values?.[0]}
        @value-changed=${this._valueChanged}
      >
      </ha-date-input>
      <ha-time-input
        enable-second
        .value=${values?.[1] || "00:00:00"}
        .locale=${this.hass.locale}
        .disabled=${this.disabled}
        @value-changed=${this._valueChanged}
      ></ha-time-input>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    fireEvent(this, "value-changed", {
      value: `${this._dateInput.value} ${this._timeInput.value}`,
    });
  }

  static styles = css`
    :host {
      display: flex;
      align-items: center;
      flex-direction: row;
    }

    ha-date-input {
      min-width: 150px;
      margin-right: 4px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-datetime": HaDateTimeSelector;
  }
}
