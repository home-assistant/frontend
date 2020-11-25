import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
} from "lit-element";
import { HomeAssistant } from "../../types";
import { DateTimeSelector } from "../../data/selector";
import "@polymer/paper-input/paper-input";
import "../ha-slider";
import { fireEvent } from "../../common/dom/fire_event";
import "../ha-date-input";
import type { HaDateInput } from "../ha-date-input";
import "../paper-time-input";
import type { PaperTimeInput } from "../paper-time-input";

@customElement("ha-selector-datetime")
export class HaDateTimeSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public selector!: DateTimeSelector;

  @property() public value?: number;

  @property() public label?: string;

  protected render() {
    const date = this.value ? new Date(this.value) : undefined;

    return html`${this.label}
      <div>
        ${this.selector.datetime.has_date
          ? html`
              <ha-date-input
                .value=${date
                  ? `${date.getFullYear()}-${
                      date.getMonth() + 1
                    }-${date.getDate()}`
                  : undefined}
                @change=${this._dateChanged}
              ></ha-date-input>
              ${this.selector.datetime.has_time ? html`<span>,</span>` : ""}
            `
          : ``}
        ${this.selector.datetime.has_time
          ? html`
              <paper-time-input
                .hour=${date?.getHours()}
                .min=${date?.getMinutes()}
                .amPm=${false}
                @change=${this._timeChanged}
                hide-label
                format="24"
              ></paper-time-input>
            `
          : ``}
      </div>`;
  }

  private _timeChanged(ev) {
    const date = this.value ? new Date(this.value) : new Date(0);

    const timeInput: PaperTimeInput = ev.target;

    date.setHours(timeInput.hour);
    date.setMinutes(timeInput.min);

    fireEvent(this, "value-changed", {
      value: date.toISOString(),
    });
  }

  private _dateChanged(ev) {
    const date = this.value ? new Date(this.value) : new Date(0);

    const dateInput: HaDateInput = ev.target;

    const parts = dateInput.value.split("-");
    date.setFullYear(parseInt(parts[0]));
    date.setMonth(parseInt(parts[1]) - 1);
    date.setDate(parseInt(parts[2]));

    fireEvent(this, "value-changed", {
      value: date.toISOString(),
    });
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      div {
        display: flex;
        align-items: flex-end;
      }
      span {
        margin: 0 8px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-datetime": HaDateTimeSelector;
  }
}
