import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-date-input";
import { UNAVAILABLE_STATES, UNKNOWN } from "../../../data/entity";
import {
  setInputDateTimeValue,
  stateToIsoDateString,
} from "../../../data/input_datetime";
import type { HomeAssistant } from "../../../types";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import "../components/hui-generic-entity-row";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import type { EntityConfig, LovelaceRow } from "./types";
import "../../../components/ha-time-input";
import { computeStateName } from "../../../common/entity/compute_state_name";

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

  protected render(): TemplateResult {
    if (!this._config || !this.hass) {
      return html``;
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
        ${stateObj.attributes.has_date
          ? html`
              <ha-date-input
                .label=${stateObj.attributes.has_time ? name : undefined}
                .locale=${this.hass.locale}
                .disabled=${UNAVAILABLE_STATES.includes(stateObj.state)}
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
                .disabled=${UNAVAILABLE_STATES.includes(stateObj.state)}
                @value-changed=${this._timeChanged}
                @click=${this._stopEventPropagation}
              ></ha-time-input>
            `
          : ``}
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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-input-datetime-entity-row": HuiInputDatetimeEntityRow;
  }
}
