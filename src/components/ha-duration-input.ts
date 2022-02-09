import { html, LitElement, TemplateResult } from "lit";
import { customElement, property, query } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import "./ha-base-time-input";
import type { TimeChangedEvent } from "./ha-base-time-input";

export interface HaDurationData {
  hours?: number;
  minutes?: number;
  seconds?: number;
  milliseconds?: number;
}

@customElement("ha-duration-input")
class HaDurationInput extends LitElement {
  @property({ attribute: false }) public data!: HaDurationData;

  @property() public label?: string;

  @property({ type: Boolean }) public required?: boolean;

  @property({ type: Boolean }) public enableMillisecond?: boolean;

  @property({ type: Boolean }) public disabled = false;

  @query("paper-time-input", true) private _input?: HTMLElement;

  public focus() {
    if (this._input) {
      this._input.focus();
    }
  }

  protected render(): TemplateResult {
    return html`
      <ha-base-time-input
        .label=${this.label}
        .required=${this.required}
        .autoValidate=${this.required}
        .disabled=${this.disabled}
        errorMessage="Required"
        enableSecond
        .enableMillisecond=${this.enableMillisecond}
        format="24"
        .hours=${this._hours}
        .minutes=${this._minutes}
        .seconds=${this._seconds}
        .milliseconds=${this._milliseconds}
        @value-changed=${this._durationChanged}
        noHoursLimit
        hourLabel="hh"
        minLabel="mm"
        secLabel="ss"
        millisecLabel="ms"
      ></ha-base-time-input>
    `;
  }

  private get _hours() {
    return this.data?.hours ? Number(this.data.hours) : 0;
  }

  private get _minutes() {
    return this.data?.minutes ? Number(this.data.minutes) : 0;
  }

  private get _seconds() {
    return this.data?.seconds ? Number(this.data.seconds) : 0;
  }

  private get _milliseconds() {
    return this.data?.milliseconds ? Number(this.data.milliseconds) : 0;
  }

  private _durationChanged(ev: CustomEvent<{ value: TimeChangedEvent }>) {
    ev.stopPropagation();
    const value = { ...ev.detail.value };

    if (!this.enableMillisecond && !value.milliseconds) {
      // @ts-ignore
      delete value.milliseconds;
    } else if (value.milliseconds > 999) {
      value.seconds += Math.floor(value.milliseconds / 1000);
      value.milliseconds %= 1000;
    }

    if (value.seconds > 59) {
      value.minutes += Math.floor(value.seconds / 60);
      value.seconds %= 60;
    }

    if (value.minutes > 59) {
      value.hours += Math.floor(value.minutes / 60);
      value.minutes %= 60;
    }

    fireEvent(this, "value-changed", {
      value,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-duration-input": HaDurationInput;
  }
}
