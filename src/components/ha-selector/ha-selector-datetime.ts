import { css, html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import type { DateTimeSelector } from "../../data/selector";
import type { HomeAssistant } from "../../types";
import "../ha-date-input";
import type { HaDateInput } from "../ha-date-input";
import "../ha-time-input";
import "../ha-input-helper-text";
import type { HaTimeInput } from "../ha-time-input";

@customElement("ha-selector-datetime")
export class HaDateTimeSelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selector!: DateTimeSelector;

  @property() public value?: string;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  @query("ha-date-input") private _dateInput!: HaDateInput;

  @query("ha-time-input") private _timeInput!: HaTimeInput;

  protected render() {
    const values =
      typeof this.value === "string" ? this.value.split(" ") : undefined;

    return html`
      <div class="input">
        <ha-date-input
          .label=${this.label}
          .locale=${this.hass.locale}
          .disabled=${this.disabled}
          .required=${this.required}
          .value=${values?.[0]}
          @value-changed=${this._valueChanged}
        >
        </ha-date-input>
        <ha-time-input
          enable-second
          .value=${values?.[1] || "00:00:00"}
          .locale=${this.hass.locale}
          .disabled=${this.disabled}
          .required=${this.required}
          @value-changed=${this._valueChanged}
        ></ha-time-input>
      </div>
      ${this.helper
        ? html`<ha-input-helper-text>${this.helper}</ha-input-helper-text>`
        : ""}
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    if (this._dateInput.value && this._timeInput.value) {
      fireEvent(this, "value-changed", {
        value: `${this._dateInput.value} ${this._timeInput.value}`,
      });
    }
  }

  static styles = css`
    .input {
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
