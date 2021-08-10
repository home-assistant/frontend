import { HassEntity } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-date-input";
import "../../../components/ha-time-input";
import { UNAVAILABLE_STATES, UNKNOWN } from "../../../data/entity";
import { setInputDateTimeValue } from "../../../data/input_datetime";
import type { HomeAssistant } from "../../../types";

@customElement("more-info-input_datetime")
class MoreInfoInputDatetime extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  protected render(): TemplateResult {
    if (!this.stateObj) {
      return html``;
    }

    return html`
        ${
          this.stateObj.attributes.has_date
            ? html`
                <ha-date-input
                  .value=${`${this.stateObj.attributes.year}-${this.stateObj.attributes.month}-${this.stateObj.attributes.day}`}
                  .disabled=${UNAVAILABLE_STATES.includes(this.stateObj.state)}
                  @value-changed=${this._dateChanged}
                >
                </ha-date-input>
                ${this.stateObj.attributes.has_time ? "," : ""}
              `
            : ``
        }
        ${
          this.stateObj.attributes.has_time
            ? html`
                <ha-time-input
                  .value=${this.stateObj.state === UNKNOWN
                    ? ""
                    : this.stateObj.attributes.has_date
                    ? this.stateObj.state.split(" ")[1]
                    : this.stateObj.state}
                  .locale=${this.hass.locale}
                  .disabled=${UNAVAILABLE_STATES.includes(this.stateObj.state)}
                  hide-label
                  @value-changed=${this._timeChanged}
                  @click=${this._stopEventPropagation}
                ></ha-time-input>
              `
            : ``
        }
      </hui-generic-entity-row>
    `;
  }

  private _stopEventPropagation(ev: Event): void {
    ev.stopPropagation();
  }

  private _timeChanged(ev): void {
    setInputDateTimeValue(
      this.hass!,
      this.stateObj!.entity_id,
      ev.detail.value,
      this.stateObj!.attributes.has_date
        ? this.stateObj!.state.split(" ")[0]
        : undefined
    );
    ev.target.blur();
  }

  private _dateChanged(ev): void {
    setInputDateTimeValue(
      this.hass!,
      this.stateObj!.entity_id,
      this.stateObj!.attributes.has_time
        ? this.stateObj!.state.split(" ")[1]
        : undefined,
      ev.detail.value
    );

    ev.target.blur();
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: flex;
        align-items: center;
        justify-content: flex-end;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-input_datetime": MoreInfoInputDatetime;
  }
}
