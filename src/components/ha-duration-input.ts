import { html, LitElement, TemplateResult } from "lit";
import { customElement, property, query } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import "./paper-time-input";

export interface HaDurationData {
  hours?: number;
  minutes?: number;
  seconds?: number;
  milliseconds?: number;
}

@customElement("ha-duration-input")
class HaDurationInput extends LitElement {
  @property() public data!: HaDurationData;

  @property() public label?: string;

  @property() public suffix?: string;

  @property({ type: Boolean }) public required?: boolean;

  @property({ type: Boolean }) public enableMillisecond?: boolean;

  @query("paper-time-input", true) private _input?: HTMLElement;

  public focus() {
    if (this._input) {
      this._input.focus();
    }
  }

  protected render(): TemplateResult {
    return html`
      <paper-time-input
        .label=${this.label}
        .required=${this.required}
        .autoValidate=${this.required}
        error-message="Required"
        enable-second
        .enableMillisecond=${this.enableMillisecond}
        format="24"
        .hour=${this._parseDuration(this._hours)}
        .min=${this._parseDuration(this._minutes)}
        .sec=${this._parseDuration(this._seconds)}
        .millisec=${this._parseDurationMillisec(this._milliseconds)}
        @hour-changed=${this._hourChanged}
        @min-changed=${this._minChanged}
        @sec-changed=${this._secChanged}
        @millisec-changed=${this._millisecChanged}
        float-input-labels
        no-hours-limit
        always-float-input-labels
        hour-label="hh"
        min-label="mm"
        sec-label="ss"
        millisec-label="ms"
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

  private get _milliseconds() {
    return this.data && this.data.milliseconds
      ? Number(this.data.milliseconds)
      : 0;
  }

  private _parseDuration(value) {
    return value.toString().padStart(2, "0");
  }

  private _parseDurationMillisec(value) {
    return value.toString().padStart(3, "0");
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

  private _millisecChanged(ev) {
    this._durationChanged(ev, "milliseconds");
  }

  private _durationChanged(ev, unit) {
    let value = Number(ev.detail.value);

    if (value === this[`_${unit}`]) {
      return;
    }

    let hours = this._hours;
    let minutes = this._minutes;

    if (unit === "seconds" && value > 59) {
      minutes += Math.floor(value / 60);
      value %= 60;
    }

    if (unit === "minutes" && value > 59) {
      hours += Math.floor(value / 60);
      value %= 60;
    }

    fireEvent(this, "value-changed", {
      value: {
        hours,
        minutes,
        seconds: this._seconds,
        milliseconds: this._milliseconds,
        ...{ [unit]: value },
      },
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-duration-input": HaDurationInput;
  }
}
