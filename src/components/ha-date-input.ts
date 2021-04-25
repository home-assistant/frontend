import "@vaadin/vaadin-date-picker/theme/material/vaadin-date-picker-light";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  PropertyValues,
  query,
} from "lit-element";
import "@polymer/paper-input/paper-input";
import { fireEvent } from "../common/dom/fire_event";
import { mdiCalendar } from "@mdi/js";
import "./ha-svg-icon";

const i18n = {
  monthNames: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
  weekdays: [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ],
  weekdaysShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  firstDayOfWeek: 0,
  week: "Week",
  calendar: "Calendar",
  clear: "Clear",
  today: "Today",
  cancel: "Cancel",
  formatTitle: (monthName, fullYear) => {
    return monthName + " " + fullYear;
  },
  formatDate: (d: { day: number; month: number; year: number }) => {
    return [
      ("0000" + String(d.year)).slice(-4),
      ("0" + String(d.month + 1)).slice(-2),
      ("0" + String(d.day)).slice(-2),
    ].join("-");
  },
  parseDate: (text: string) => {
    const parts = text.split("-");
    const today = new Date();
    let date;
    let month = today.getMonth();
    let year = today.getFullYear();
    if (parts.length === 3) {
      year = parseInt(parts[0]);
      if (parts[0].length < 3 && year >= 0) {
        year += year < 50 ? 2000 : 1900;
      }
      month = parseInt(parts[1]) - 1;
      date = parseInt(parts[2]);
    } else if (parts.length === 2) {
      month = parseInt(parts[0]) - 1;
      date = parseInt(parts[1]);
    } else if (parts.length === 1) {
      date = parseInt(parts[0]);
    }

    if (date !== undefined) {
      return { day: date, month, year };
    }
    return undefined;
  },
};
@customElement("ha-date-input")
export class HaDateInput extends LitElement {
  @property() public value?: string;

  @property({ type: Boolean }) public disabled = false;

  @property() public label?: string;

  @query("vaadin-date-picker-light", true) private _datePicker;

  private _inited = false;

  updated(changedProps: PropertyValues) {
    if (changedProps.has("value")) {
      this._datePicker.value = this.value;
      this._inited = true;
    }
  }

  render() {
    return html`<vaadin-date-picker-light
      .disabled=${this.disabled}
      @value-changed=${this._valueChanged}
      attr-for-value="value"
      .i18n=${i18n}
    >
      <paper-input .label=${this.label} no-label-float>
        <ha-svg-icon slot="suffix" .path=${mdiCalendar}></ha-svg-icon>
      </paper-input>
    </vaadin-date-picker-light>`;
  }

  private _valueChanged(ev: CustomEvent) {
    if (
      !this.value ||
      (this._inited && !this._compareStringDates(ev.detail.value, this.value))
    ) {
      this.value = ev.detail.value;
      fireEvent(this, "change");
      fireEvent(this, "value-changed", { value: ev.detail.value });
    }
  }

  private _compareStringDates(a: string, b: string): boolean {
    const aParts = a.split("-");
    const bParts = b.split("-");
    let i = 0;
    for (const aPart of aParts) {
      if (Number(aPart) !== Number(bParts[i])) {
        return false;
      }
      i++;
    }
    return true;
  }

  static get styles(): CSSResult {
    return css`
      paper-input {
        width: 110px;
      }
      ha-svg-icon {
        color: var(--secondary-text-color);
      }
    `;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "ha-date-input": HaDateInput;
  }
}
