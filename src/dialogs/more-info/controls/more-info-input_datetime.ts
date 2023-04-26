import { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-date-time-input";
import { isUnavailableState, UNKNOWN } from "../../../data/entity";
import {
  setInputDateTimeValue,
  stateToIsoDateString,
} from "../../../data/input_datetime";
import type { HomeAssistant } from "../../../types";

@customElement("more-info-input_datetime")
class MoreInfoInputDatetime extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  protected render() {
    if (!this.stateObj) {
      return nothing;
    }

    const both =
      this.stateObj.attributes.has_date && this.stateObj.attributes.has_time;
    const parts = stateToIsoDateString(this.stateObj).split("T");
    const value =
      this.stateObj.state === UNKNOWN
        ? ""
        : both
        ? parts[0] + " " + parts[1]
        : this.stateObj.attributes.has_date
        ? parts[0]
        : parts[1];

    return html`
      <ha-date-time-input
        .enableDate=${this.stateObj.attributes.has_date}
        .enableTime=${this.stateObj.attributes.has_time}
        .value=${value}
        .locale=${this.hass.locale}
        .disabled=${isUnavailableState(this.stateObj.state)}
        @value-changed=${this._valueChanged}
      ></ha-date-time-input>
    `;
  }

  private _valueChanged(ev: CustomEvent<{ value: string }>): void {
    ev.stopPropagation();
    if (this.stateObj) {
      const parts = ev.detail.value.split(" ");
      const date =
        this.stateObj.attributes.has_date && parts[0] ? parts[0] : undefined;
      const time =
        this.stateObj.attributes.has_time && parts[parts.length - 1]
          ? parts[parts.length - 1]
          : undefined;
      setInputDateTimeValue(this.hass!, this.stateObj.entity_id, date, time);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-input_datetime": MoreInfoInputDatetime;
  }
}
