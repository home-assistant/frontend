import { html, LitElement, PropertyValues, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeStateName } from "../../../common/entity/compute_state_name";
import "../../../components/ha-date-time-input";
import { isUnavailableState, UNKNOWN } from "../../../data/entity";
import {
  setInputDateTimeValue,
  stateToIsoDateString,
} from "../../../data/input_datetime";
import type { HomeAssistant } from "../../../types";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import "../components/hui-generic-entity-row";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import type { EntityConfig, LovelaceRow } from "./types";

@customElement("hui-input-datetime-entity-row")
class HuiInputDatetimeEntityRow extends LitElement implements LovelaceRow {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: EntityConfig;

  public setConfig(config: EntityConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  protected render() {
    if (!this._config || !this.hass) {
      return nothing;
    }

    const stateObj = this.hass.states[this._config.entity];

    if (!stateObj) {
      return html`
        <hui-warning>
          ${createEntityNotFoundWarning(this.hass, this._config.entity)}
        </hui-warning>
      `;
    }

    const name = this._config.name || computeStateName(stateObj);
    const both = stateObj.attributes.has_date && stateObj.attributes.has_time;
    const parts = stateToIsoDateString(stateObj).split("T");
    const value =
      stateObj.state === UNKNOWN
        ? ""
        : both
        ? parts[0] + " " + parts[1]
        : stateObj.attributes.has_date
        ? parts[0]
        : parts[1];

    return html`
      <hui-generic-entity-row
        .hass=${this.hass}
        .config=${this._config}
        .hideName=${both}
      >
        <ha-date-time-input
          .label=${both ? name : undefined}
          .locale=${this.hass.locale}
          .disabled=${isUnavailableState(stateObj.state)}
          .value=${value}
          @value-changed=${this._valueChanged}
          .enableDate=${stateObj.attributes.has_date}
          .enableTime=${stateObj.attributes.has_time}
        ></ha-date-time-input>
      </hui-generic-entity-row>
    `;
  }

  private _valueChanged(ev: CustomEvent<{ value: string }>): void {
    ev.stopPropagation();
    const stateObj = this.hass!.states[this._config!.entity];
    const parts = ev.detail.value.split(" ");
    const date =
      stateObj.attributes.has_date && parts[0] ? parts[0] : undefined;
    const time =
      stateObj.attributes.has_time && parts[parts.length - 1]
        ? parts[parts.length - 1]
        : undefined;
    setInputDateTimeValue(this.hass!, stateObj.entity_id, time, date);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-input-datetime-entity-row": HuiInputDatetimeEntityRow;
  }
}
