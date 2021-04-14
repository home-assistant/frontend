import { customElement, html, LitElement, property } from "lit-element";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import { TimeSelector } from "../../data/selector";
import { HomeAssistant } from "../../types";
import "../paper-time-input";
@customElement("ha-selector-time")
export class HaTimeSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public selector!: TimeSelector;

  @property() public value?: string;

  @property() public label?: string;

  @property({ type: Boolean }) public disabled = false;

  private _useAmPm = memoizeOne((language: string) => {
    const test = new Date().toLocaleString(language);
    return test.includes("AM") || test.includes("PM");
  });

  protected render() {
    const useAMPM = this._useAmPm(this.hass.locale.language);

    const parts = this.value?.split(":") || [];
    const hours = parts[0];

    return html`
      <paper-time-input
        .label=${this.label}
        .hour=${hours &&
        (useAMPM && Number(hours) > 12 ? Number(hours) - 12 : hours)}
        .min=${parts[1]}
        .sec=${parts[2]}
        .format=${useAMPM ? 12 : 24}
        .amPm=${useAMPM && (Number(hours) > 12 ? "PM" : "AM")}
        .disabled=${this.disabled}
        @change=${this._timeChanged}
        @am-pm-changed=${this._timeChanged}
        hide-label
        enable-second
      ></paper-time-input>
    `;
  }

  private _timeChanged(ev) {
    let value = ev.target.value;
    const useAMPM = this._useAmPm(this.hass.locale.language);
    let hours = Number(ev.target.hour || 0);
    if (value && useAMPM) {
      if (ev.target.amPm === "PM") {
        hours += 12;
      }
      value = `${hours}:${ev.target.min || "00"}:${ev.target.sec || "00"}`;
    }
    if (value === this.value) {
      return;
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
