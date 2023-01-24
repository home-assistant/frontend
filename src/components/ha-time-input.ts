import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { useAmPm } from "../common/datetime/use_am_pm";
import { fireEvent } from "../common/dom/fire_event";
import { FrontendLocaleData } from "../data/translation";
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

  protected render() {
    const useAMPM = useAmPm(this.locale);

    const parts = this.value?.split(":") || [];
    let hours = parts[0];
    const numberHours = Number(parts[0]);
    if (numberHours && useAMPM && numberHours > 12 && numberHours < 24) {
      hours = String(numberHours - 12).padStart(2, "0");
    }
    if (useAMPM && numberHours === 0) {
      hours = "12";
    }

    return html`
      <ha-base-time-input
        .label=${this.label}
        .hours=${Number(hours)}
        .minutes=${Number(parts[1])}
        .seconds=${Number(parts[2])}
        .format=${useAMPM ? 12 : 24}
        .amPm=${useAMPM && numberHours >= 12 ? "PM" : "AM"}
        .disabled=${this.disabled}
        @value-changed=${this._timeChanged}
        .enableSecond=${this.enableSecond}
        .required=${this.required}
        .helper=${this.helper}
      ></ha-base-time-input>
    `;
  }

  private _timeChanged(ev: CustomEvent<{ value: TimeChangedEvent }>) {
    ev.stopPropagation();
    const eventValue = ev.detail.value;

    const useAMPM = useAmPm(this.locale);
    let value;

    if (
      !isNaN(eventValue.hours) ||
      !isNaN(eventValue.minutes) ||
      !isNaN(eventValue.seconds)
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
