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
    let p: Date | undefined;
    if (this.value) {
      p = new Date(this.value);
      if (isNaN(p.getTime())) {
        p = undefined;
      }
    }
    if (!p) {
      p = new Date();
    }
    const date = `${p.getFullYear()}-${p.getMonth() + 1}-${p.getDate()}`;
    const time = `${p.getHours()}:${p.getMinutes()}:${p.getSeconds()}`;

    return html`
      <ha-date-input
        .label=${this.label}
        .locale=${this.hass.locale}
        .disabled=${this.disabled}
        .value=${date}
        @value-changed=${this._valueChanged}
      >
      </ha-date-input>
      <ha-time-input
        enable-second
        .value=${time}
        .locale=${this.hass.locale}
        .disabled=${this.disabled}
        @value-changed=${this._valueChanged}
      ></ha-time-input>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const date = (this._dateInput.value || "").split("T")[0];
    const time = this._timeInput.value || "";
    fireEvent(this, "value-changed", {
      value: date && time ? `${date}T${time}` : undefined,
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
