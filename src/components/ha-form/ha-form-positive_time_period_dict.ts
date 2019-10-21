import {
  customElement,
  LitElement,
  html,
  property,
  TemplateResult,
  query,
} from "lit-element";
import { HaFormElement, HaFormTimeData, HaFormTimeSchema } from "./ha-form";
import { fireEvent } from "../../common/dom/fire_event";

@customElement("ha-form-positive_time_period_dict")
export class HaFormTimePeriod extends LitElement implements HaFormElement {
  @property() public schema!: HaFormTimeSchema;
  @property() public data!: HaFormTimeData;
  @property() public label!: string;
  @property() public suffix!: string;
  @query("paper-time-input") private _input?: HTMLElement;

  public focus() {
    if (this._input) {
      this._input.focus();
    }
  }

  protected render(): TemplateResult | void {
    return html`
      <paper-time-input
        .label=${this.label}
        .required=${this.schema.required}
        .autoValidate=${this.schema.required}
        error-message="Required"
        enable-second
        format="24"
        .hour=${this._parseDuration(this._hours)}
        .min=${this._parseDuration(this._minutes)}
        .sec=${this._parseDuration(this._seconds)}
        @hour-changed=${this._hourChanged}
        @min-changed=${this._minChanged}
        @sec-changed=${this._secChanged}
        float-input-labels
        no-hours-limit
        always-float-input-labels
        hour-label="hh"
        min-label="mm"
        sec-label="ss"
      ></paper-time-input>
    `;
  }

  private get _hours() {
    return this.data && this.data.hours ? Number(this.data.hours) : 0;
  }

  private get _minutes() {
    return this.data && this.data.minutes ? Number(this.data.minutes) : 0;
  }

  private get _seconds() {
    return this.data && this.data.seconds ? Number(this.data.seconds) : 0;
  }

  private _parseDuration(value) {
    return value.toString().padStart(2, "0");
  }

  private _hourChanged(ev) {
    this._durationChanged(ev, "hours");
  }

  private _minChanged(ev) {
    this._durationChanged(ev, "minutes");
  }

  private _secChanged(ev) {
    this._durationChanged(ev, "seconds");
  }

  private _durationChanged(ev, unit) {
    let value = Number(ev.detail.value);

    if (value === this[`_${unit}`]) {
      return;
    }

    let hours = this._hours;
    let minutes = this._minutes;

    if (unit === "seconds" && value > 59) {
      minutes = minutes + Math.floor(value / 60);
      value %= 60;
    }

    if (unit === "minutes" && value > 59) {
      hours = hours + Math.floor(value / 60);
      value %= 60;
    }

    fireEvent(
      this,
      "value-changed",
      {
        value: {
          hours,
          minutes,
          seconds: this._seconds,
          ...{ [unit]: value },
        },
      },
      { bubbles: false }
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-form-positive_time_period_dict": HaFormTimePeriod;
  }
}
