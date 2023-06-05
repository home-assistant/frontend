import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeStateName } from "../../../common/entity/compute_state_name";
import "../../../components/ha-date-input";
import "../../../components/ha-time-input";
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

    return html`
      <hui-generic-entity-row
        .hass=${this.hass}
        .config=${this._config}
        .hideName=${stateObj.attributes.has_date &&
        stateObj.attributes.has_time}
      >
        <div
          class=${stateObj.attributes.has_date && stateObj.attributes.has_time
            ? "both"
            : ""}
        >
          ${stateObj.attributes.has_date
            ? html`
                <ha-date-input
                  .label=${stateObj.attributes.has_time ? name : undefined}
                  .locale=${this.hass.locale}
                  .disabled=${isUnavailableState(stateObj.state)}
                  .value=${stateToIsoDateString(stateObj)}
                  @value-changed=${this._dateChanged}
                >
                </ha-date-input>
              `
            : ``}
          ${stateObj.attributes.has_time
            ? html`
                <ha-time-input
                  .value=${stateObj.state === UNKNOWN
                    ? ""
                    : stateObj.attributes.has_date
                    ? stateObj.state.split(" ")[1]
                    : stateObj.state}
                  .locale=${this.hass.locale}
                  .disabled=${isUnavailableState(stateObj.state)}
                  @value-changed=${this._timeChanged}
                  @click=${this._stopEventPropagation}
                ></ha-time-input>
              `
            : ``}
        </div>
      </hui-generic-entity-row>
    `;
  }

  private _stopEventPropagation(ev: Event): void {
    ev.stopPropagation();
  }

  private _timeChanged(ev: CustomEvent<{ value: string }>): void {
    const stateObj = this.hass!.states[this._config!.entity];
    setInputDateTimeValue(
      this.hass!,
      stateObj.entity_id,
      ev.detail.value,
      stateObj.attributes.has_date ? stateObj.state.split(" ")[0] : undefined
    );
  }

  private _dateChanged(ev: CustomEvent<{ value: string }>): void {
    const stateObj = this.hass!.states[this._config!.entity];

    setInputDateTimeValue(
      this.hass!,
      stateObj.entity_id,
      stateObj.attributes.has_time ? stateObj.state.split(" ")[1] : undefined,
      ev.detail.value
    );
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-date-input + ha-time-input {
        margin-left: 4px;
        margin-inline-start: 4px;
        margin-inline-end: initial;
        direction: var(--direction);
      }
      div.both {
        display: flex;
        justify-content: flex-end;
        width: 100%;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-input-datetime-entity-row": HuiInputDatetimeEntityRow;
  }
}
