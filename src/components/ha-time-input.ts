import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { useAmPm } from "../common/datetime/use_am_pm";
import { fireEvent } from "../common/dom/fire_event";
import "./paper-time-input";
import { FrontendLocaleData } from "../data/translation";

@customElement("ha-time-input")
export class HaTimeInput extends LitElement {
  @property() public locale!: FrontendLocaleData;

  @property() public value?: string;

  @property() public label?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean, attribute: "hide-label" }) public hideLabel =
    false;

  @property({ type: Boolean, attribute: "enable-second" })
  public enableSecond = false;

  protected render() {
    const useAMPM = useAmPm(this.locale);

    const parts = this.value?.split(":") || [];
    let hours = parts[0];
    const numberHours = Number(parts[0]);
    if (numberHours && useAMPM && numberHours > 12) {
      hours = String(numberHours - 12).padStart(2, "0");
    }
    if (useAMPM && numberHours === 0) {
      hours = "12";
    }

    return html`
      <paper-time-input
        .label=${this.label}
        .hour=${hours}
        .min=${parts[1]}
        .sec=${parts[2]}
        .format=${useAMPM ? 12 : 24}
        .amPm=${useAMPM && (numberHours >= 12 ? "PM" : "AM")}
        .disabled=${this.disabled}
        @change=${this._timeChanged}
        @am-pm-changed=${this._timeChanged}
        .hideLabel=${this.hideLabel}
        .enableSecond=${this.enableSecond}
      ></paper-time-input>
    `;
  }

  private _timeChanged(ev) {
    let value = ev.target.value;
    const useAMPM = useAmPm(this.locale);
    let hours = Number(ev.target.hour || 0);
    if (value && useAMPM) {
      if (ev.target.amPm === "PM" && hours < 12) {
        hours += 12;
      }
      if (ev.target.amPm === "AM" && hours === 12) {
        hours = 0;
      }
      value = `${hours.toString().padStart(2, "0")}:${ev.target.min || "00"}:${
        ev.target.sec || "00"
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
