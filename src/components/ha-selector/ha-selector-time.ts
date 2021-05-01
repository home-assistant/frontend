import { customElement, html, LitElement, property } from "lit-element";
import { useAmPm } from "../../common/datetime/use_am_pm";
import { fireEvent } from "../../common/dom/fire_event";
import { TimeSelector } from "../../data/selector";
import { HomeAssistant } from "../../types";
import memoizeOne from "memoize-one";
import "../paper-time-input";
import { FrontendLocaleData } from "../../data/translation";
@customElement("ha-selector-time")
export class HaTimeSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public selector!: TimeSelector;

  @property() public value?: string;

  @property() public label?: string;

  @property({ type: Boolean }) public disabled = false;

  private _useAmPmMem = memoizeOne((locale: FrontendLocaleData): boolean =>
    useAmPm(locale)
  );

  protected render() {
    const useAMPM = this._useAmPmMem(this.hass.locale);

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
    const useAMPM = this._useAmPmMem(this.hass.locale);
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
