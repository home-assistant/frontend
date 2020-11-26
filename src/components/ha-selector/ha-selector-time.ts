import { customElement, html, LitElement, property } from "lit-element";
import { HomeAssistant } from "../../types";
import { TimeSelector } from "../../data/selector";
import { fireEvent } from "../../common/dom/fire_event";
import "../paper-time-input";

const test = new Date().toLocaleString();
const useAMPM = test.includes("AM") || test.includes("PM");

@customElement("ha-selector-time")
export class HaTimeSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public selector!: TimeSelector;

  @property() public value?: string;

  @property() public label?: string;

  protected render() {
    const parts = this.value?.split(":") || [];
    const hours = useAMPM ? parts[0] ?? "12" : parts[0] ?? "0";

    return html`
      <paper-time-input
        .label=${this.label}
        .hour=${useAMPM && Number(hours) > 12 ? Number(hours) - 12 : hours}
        .min=${parts[1] ?? "00"}
        .sec=${parts[2] ?? "00"}
        .format=${useAMPM ? 12 : 24}
        .amPm=${useAMPM && (Number(hours) > 12 ? "PM" : "AM")}
        @change=${this._timeChanged}
        @am-pm-changed=${this._timeChanged}
        hide-label
        enable-second
      ></paper-time-input>
    `;
  }

  private _timeChanged(ev) {
    let value = ev.target.value;
    if (useAMPM) {
      let hours = Number(ev.target.hour);
      if (ev.target.amPm === "PM") {
        hours += 12;
      }
      value = `${hours}:${ev.target.min}:${ev.target.sec}`;
    }
    fireEvent(this, "value-changed", {
      value,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-time": HaTimeSelector;
  }
}
