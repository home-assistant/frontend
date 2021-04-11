import { HassEntity } from "home-assistant-js-websocket";
import {
  customElement,
  html,
  LitElement,
  property,
  query,
  TemplateResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import type { HaDateInput } from "../../../components/ha-date-input";
import type { PaperTimeInput } from "../../../components/paper-time-input";
import { UNAVAILABLE_STATES } from "../../../data/entity";
import { setInputDateTimeValue } from "../../../data/input_datetime";
import type { HomeAssistant } from "../../../types";

@customElement("more-info-input_datetime")
class DatetimeInput extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  @query("paper-time-input") private _timeInputEl?: PaperTimeInput;

  @query("ha-date-input") private _dateInputEl?: HaDateInput;

  protected render(): TemplateResult {
    if (!this.hass || !this.stateObj) {
      return html``;
    }

    return html`
      <div
        class="more-info-input_datetime ${classMap({
          "has-has_time": !!this.stateObj.attributes.has_time,
          "has-has_date": !!this.stateObj.attributes.has_date,
        })}"
      >
        ${this.stateObj.attributes.has_date
          ? html`
              <div>
                <ha-date-input
                  .label="${this.hass.localize(
                    "ui.dialogs.helper_settings.input_datetime.date"
                  )}"
                  .disabled=${UNAVAILABLE_STATES.includes(this.stateObj.state)}
                  .value=${UNAVAILABLE_STATES.includes(this.stateObj.state)
                    ? ""
                    : `${this.stateObj.attributes.year}-${this.stateObj.attributes.month}-${this.stateObj.attributes.day}`}
                  @change=${this._selectedValueChanged}
                  @click=${this._stopEventPropagation}
                ></ha-date-input>
              </div>
            `
          : ""}
        ${this.stateObj.attributes.has_time
          ? html`
              <div>
                <paper-time-input
                  .label="${this.hass.localize(
                    "ui.dialogs.helper_settings.input_datetime.time"
                  )}"
                  .disabled=${UNAVAILABLE_STATES.includes(this.stateObj.state)}
                  .hour=${UNAVAILABLE_STATES.includes(this.stateObj.state)
                    ? ""
                    : this.stateObj.attributes.hour.toString().padStart(2, "0")}
                  .min=${UNAVAILABLE_STATES.includes(this.stateObj.state)
                    ? ""
                    : this.stateObj.attributes.minute
                        .toString()
                        .padStart(2, "0")}
                  @change=${this._selectedValueChanged}
                  @click=${this._stopEventPropagation}
                  format="24"
                ></paper-time-input>
              </div>
            `
          : ""}
      </div>
    `;
  }

  private _stopEventPropagation(ev: Event): void {
    ev.stopPropagation();
  }

  private _selectedValueChanged(ev): void {
    if (!this.stateObj) {
      return;
    }

    const time = this._timeInputEl
      ? this._timeInputEl.value?.trim()
      : undefined;

    const date = this._dateInputEl ? this._dateInputEl.value : undefined;

    if (time !== this.stateObj.state) {
      setInputDateTimeValue(this.hass!, this.stateObj.entity_id, time, date);
    }

    ev.target.blur();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-input_datetime": DatetimeInput;
  }
}
