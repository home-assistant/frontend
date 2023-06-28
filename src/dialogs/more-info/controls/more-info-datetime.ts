import { format } from "date-fns";
import { HassEntity } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-date-input";
import "../../../components/ha-time-input";
import { setDateTimeValue } from "../../../data/datetime";
import { isUnavailableState, UNAVAILABLE } from "../../../data/entity";
import type { HomeAssistant } from "../../../types";

@customElement("more-info-datetime")
class MoreInfoDatetime extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  protected render() {
    if (!this.stateObj || this.stateObj.state === UNAVAILABLE) {
      return nothing;
    }

    const dateObj = isUnavailableState(this.stateObj.state)
      ? undefined
      : new Date(this.stateObj.state);
    const time = dateObj ? format(dateObj, "HH:mm:ss") : undefined;
    const date = dateObj ? format(dateObj, "yyyy-MM-dd") : undefined;

    return html`<ha-date-input
        .locale=${this.hass.locale}
        .value=${date}
        .disabled=${this.stateObj.state === UNAVAILABLE}
        @value-changed=${this._dateChanged}
      >
      </ha-date-input>
      <ha-time-input
        .value=${time}
        .locale=${this.hass.locale}
        .disabled=${this.stateObj.state === UNAVAILABLE}
        @value-changed=${this._timeChanged}
        @click=${this._stopEventPropagation}
      ></ha-time-input>`;
  }

  private _stopEventPropagation(ev: Event): void {
    ev.stopPropagation();
  }

  private _timeChanged(ev: CustomEvent<{ value: string }>): void {
    if (ev.detail.value) {
      const dateObj = new Date(this.stateObj!.state);
      const newTime = ev.detail.value.split(":").map(Number);
      dateObj.setHours(newTime[0], newTime[1], newTime[2]);

      setDateTimeValue(this.hass!, this.stateObj!.entity_id, dateObj);
    }
  }

  private _dateChanged(ev: CustomEvent<{ value: string }>): void {
    if (ev.detail.value) {
      const dateObj = new Date(this.stateObj!.state);
      const newDate = ev.detail.value.split("-").map(Number);
      dateObj.setFullYear(newDate[0], newDate[1] - 1, newDate[2]);

      setDateTimeValue(this.hass!, this.stateObj!.entity_id, dateObj);
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: flex;
        align-items: center;
        justify-content: flex-end;
      }
      ha-date-input + ha-time-input {
        margin-left: 4px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-datetime": MoreInfoDatetime;
  }
}
