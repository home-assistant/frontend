import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { useAmPm } from "../common/datetime/use_am_pm";
import { fireEvent } from "../common/dom/fire_event";
import type { FrontendLocaleData } from "../data/translation";
import "./ha-base-time-input";
import type { TimeChangedEvent } from "./ha-base-time-input";

@customElement("ha-time-input")
export class HaTimeInput extends LitElement {
  @property({ attribute: false }) public locale!: FrontendLocaleData;

  @property() public value?: string;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @property({ type: Boolean, attribute: "enable-second" })
  public enableSecond = false;

  @property({ type: Boolean, reflect: true }) public clearable?: boolean;

  protected render() {
    const useAMPM = useAmPm(this.locale);

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
      if (numberHours && useAMPM && numberHours > 12 && numberHours < 24) {
        hours = numberHours - 12;
      }
      if (useAMPM && numberHours === 0) {
        hours = 12;
      }
    }

    return html`
      <ha-base-time-input
        .label=${this.label}
        .hours=${hours}
        .minutes=${minutes}
        .seconds=${seconds}
        .format=${useAMPM ? 12 : 24}
        .amPm=${useAMPM && numberHours >= 12 ? "PM" : "AM"}
        .disabled=${this.disabled}
        @value-changed=${this._timeChanged}
        .enableSecond=${this.enableSecond}
        .required=${this.required}
        .clearable=${this.clearable && this.value !== undefined}
        .helper=${this.helper}
        day-label="dd"
        hour-label="hh"
        min-label="mm"
        sec-label="ss"
        ms-label="ms"
      ></ha-base-time-input>
    `;
  }

  private _timeChanged(ev: CustomEvent<{ value?: TimeChangedEvent }>) {
    ev.stopPropagation();
    const eventValue = ev.detail.value;

    const useAMPM = useAmPm(this.locale);
    let value: string | undefined;

    // An undefined eventValue means the time selector is being cleared,
    // the `value` variable will (intentionally) be left undefined.
    if (
      eventValue !== undefined &&
      (!isNaN(eventValue.hours) ||
        !isNaN(eventValue.minutes) ||
        !isNaN(eventValue.seconds))
    ) {
      let hours = eventValue.hours || 0;
      if (eventValue && useAMPM) {
        if (eventValue.amPm === "PM" && hours < 12) {
          hours += 12;
        }
        if (eventValue.amPm === "AM" && hours === 12) {
          hours = 0;
        }
      }
      value = `${hours.toString().padStart(2, "0")}:${
        eventValue.minutes
          ? eventValue.minutes.toString().padStart(2, "0")
          : "00"
      }:${
        eventValue.seconds
          ? eventValue.seconds.toString().padStart(2, "0")
          : "00"
      }`;
    }

    if (value === this.value) {
      return;
    }

    this.value = value;
    fireEvent(this, "change");
    fireEvent(this, "value-changed", {
      value,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-time-input": HaTimeInput;
  }
}
