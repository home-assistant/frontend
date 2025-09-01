import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { useAmPm } from "../common/datetime/use_am_pm";
import { fireEvent } from "../common/dom/fire_event";
import type { FrontendLocaleData } from "../data/translation";
import "./ha-base-time-input";
import "./ha-numeric-arrow-input";
import "./ha-button";

@customElement("ha-time-picker")
export class HaTimePicker extends LitElement {
  @property({ attribute: false }) public locale!: FrontendLocaleData;

  @property({ attribute: false }) public value?: string;

  @property({ attribute: false }) public disabled = false;

  @property({ attribute: false }) public required = false;

  @property({ attribute: false }) public enableSeconds = false;

  @state() private _hours = 0;

  @state() private _minutes = 0;

  @state() private _seconds = 0;

  @state() private _useAmPm = false;

  protected firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    this._useAmPm = useAmPm(this.locale);

    let hours = NaN;
    let minutes = NaN;
    let seconds = NaN;
    let numberHours = 0;
    if (this.value) {
      const parts = this.value?.split(":") || [];
      minutes = parts[1] ? Number(parts[1]) : 0;
      seconds = parts[2] ? Number(parts[2]) : 0;
      hours = parts[0] ? Number(parts[0]) : 0;
      numberHours = hours;
      if (
        numberHours &&
        this._useAmPm &&
        numberHours > 12 &&
        numberHours < 24
      ) {
        hours = numberHours - 12;
      }
      if (this._useAmPm && numberHours === 0) {
        hours = 12;
      }
    }

    this._hours = hours;
    this._minutes = minutes;
    this._seconds = seconds;
  }

  protected render() {
    return html`<div class="time-picker-container">
      <ha-numeric-arrow-input
        .disabled=${this.disabled}
        .required=${this.required}
        .min=${this._useAmPm ? 1 : 0}
        .max=${this._useAmPm ? 12 : 23}
        .step=${1}
        .padStart=${2}
        .value=${this._hours}
        @value-changed=${this._hoursChanged}
        .labelUp=${
          // TODO: Localize
          "Increase hours"
        }
        .labelDown=${
          // TODO: Localize
          "Decrease hours"
        }
      ></ha-numeric-arrow-input>
      <span class="time-picker-separator">:</span>
      <ha-numeric-arrow-input
        .disabled=${this.disabled}
        .required=${this.required}
        .min=${0}
        .max=${59}
        .step=${1}
        .padStart=${2}
        .labelUp=${
          // TODO: Localize
          "Increase minutes"
        }
        .labelDown=${
          // TODO: Localize
          "Decrease minutes"
        }
        .value=${this._minutes}
        @value-changed=${this._minutesChanged}
      ></ha-numeric-arrow-input>
      ${this.enableSeconds
        ? html`
            <span class="time-picker-separator">:</span>
            <ha-numeric-arrow-input
              .disabled=${this.disabled}
              .required=${this.required}
              .min=${0}
              .max=${59}
              .step=${1}
              .padStart=${2}
              .labelUp=${
                // TODO: Localize
                "Increase seconds"
              }
              .labelDown=${
                // TODO: Localize
                "Decrease seconds"
              }
              .value=${this._seconds}
              @value-changed=${this._secondsChanged}
            ></ha-numeric-arrow-input>
          `
        : nothing}
      ${this._useAmPm
        ? html`
            <ha-button @click=${this._toggleAmPm}>
              ${this._hours > 12 ? "PM" : "AM"}
            </ha-button>
          `
        : nothing}
    </div>`;
  }

  protected updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);
    if (changedProperties.has("value")) {
      this._timeUpdated();
    }

    if (changedProperties.has("_hours")) {
      this._timeUpdated();
    }

    if (changedProperties.has("_minutes")) {
      this._timeUpdated();
    }

    if (changedProperties.has("_seconds")) {
      this._timeUpdated();
    }

    if (changedProperties.has("_useAmPm")) {
      this._timeUpdated();
    }
  }

  private _hoursChanged(ev: CustomEvent<{ value: number }>) {
    const value = ev.detail.value;
    console.log({ originalValue: this.value }, "hoursChanged", value);
    if (this._useAmPm) {
      if (value > 12) {
        this._hours = value - 12;
      } else if (value === 0) {
        this._hours = 12;
      } else {
        this._hours = value;
      }
    } else {
      this._hours = value;
    }
  }

  private _minutesChanged(ev: CustomEvent<{ value: number }>) {
    console.log(
      { originalValue: this.value },
      "minutesChanged",
      ev.detail.value
    );
    this._minutes = ev.detail.value;
  }

  private _secondsChanged(ev: CustomEvent<{ value: number }>) {
    console.log(
      { originalValue: this.value },
      "secondsChanged",
      ev.detail.value
    );
    this._seconds = ev.detail.value;
  }

  private _toggleAmPm() {
    this._hours = this._hours > 12 ? this._hours - 12 : this._hours + 12;
  }

  private _timeUpdated() {
    console.log(
      { originalValue: this.value },
      "timeUpdated",
      this._hours,
      this._minutes,
      this._seconds
    );
    const timeParts = [
      this._hours.toString().padStart(2, "0"),
      this._minutes.toString().padStart(2, "0"),
      this._seconds.toString().padStart(2, "0"),
    ];
    if (this._useAmPm) {
      timeParts.push(this._hours > 12 ? "PM" : "AM");
    }

    const time = timeParts.join(":");
    if (time === this.value) {
      return;
    }
    this.value = time;
    fireEvent(this, "change");
    fireEvent(this, "value-changed", { value: time });
  }

  static styles = css`
    .time-picker-container {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 4px;
    }

    .time-picker-separator {
      color: var(--primary-text-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-time-picker": HaTimePicker;
  }
}
