import { HassEntity } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-date-input";
import "../../../components/ha-time-input";
import { setDateValue } from "../../../data/date";
import { isUnavailableState } from "../../../data/entity";
import type { HomeAssistant } from "../../../types";

@customElement("more-info-date")
class MoreInfoDate extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  protected render() {
    if (!this.stateObj || isUnavailableState(this.stateObj.state)) {
      return nothing;
    }

    return html`
      <ha-date-input
        .locale=${this.hass.locale}
        .value=${this.stateObj.state}
        .disabled=${isUnavailableState(this.stateObj.state)}
        @value-changed=${this._dateChanged}
      >
      </ha-date-input>
    `;
  }

  private _dateChanged(ev: CustomEvent<{ value: string }>): void {
    setDateValue(this.hass!, this.stateObj!.entity_id, ev.detail.value);
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
    "more-info-date": MoreInfoDate;
  }
}
