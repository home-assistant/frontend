import {
  customElement,
  html,
  LitElement,
  property,
  internalProperty,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import "../../../components/ha-date-input";
import type { HaDateInput } from "../../../components/ha-date-input";
import "../../../components/paper-time-input";
import type { PaperTimeInput } from "../../../components/paper-time-input";
import { UNAVAILABLE_STATES, UNKNOWN } from "../../../data/entity";
import { setInputDateTimeValue } from "../../../data/input_datetime";
import type { HomeAssistant } from "../../../types";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import "../components/hui-generic-entity-row";
import type { EntityConfig, LovelaceRow } from "./types";
import { createEntityNotFoundWarning } from "../components/hui-warning";

@customElement("hui-input-datetime-entity-row")
class HuiInputDatetimeEntityRow extends LitElement implements LovelaceRow {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @internalProperty() private _config?: EntityConfig;

  public setConfig(config: EntityConfig): void {
    if (!config) {
      throw new Error("Configuration error");
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

    return html`
      <hui-generic-entity-row .hass=${this.hass} .config=${this._config}>
        ${stateObj.attributes.has_date
          ? html`
              <ha-date-input
                .disabled=${UNAVAILABLE_STATES.includes(stateObj.state)}
                .value=${`${stateObj.attributes.year}-${stateObj.attributes.month}-${stateObj.attributes.day}`}
                @change=${this._selectedValueChanged}
                @click=${this._stopEventPropagation}
              ></ha-date-input>
              ${stateObj.attributes.has_time ? "," : ""}
            `
          : ``}
        ${stateObj.attributes.has_time
          ? html`
              <paper-time-input
                .disabled=${UNAVAILABLE_STATES.includes(stateObj.state)}
                .hour=${stateObj.state === UNKNOWN
                  ? ""
                  : ("0" + stateObj.attributes.hour).slice(-2)}
                .min=${stateObj.state === UNKNOWN
                  ? ""
                  : ("0" + stateObj.attributes.minute).slice(-2)}
                .amPm=${false}
                @change=${this._selectedValueChanged}
                @click=${this._stopEventPropagation}
                hide-label
                format="24"
              ></paper-time-input>
            `
          : ``}
      </hui-generic-entity-row>
    `;
  }

  private _stopEventPropagation(ev: Event): void {
    ev.stopPropagation();
  }

  private get _timeInputEl(): PaperTimeInput {
    return this.shadowRoot!.querySelector("paper-time-input")!;
  }

  private get _dateInputEl(): HaDateInput {
    return this.shadowRoot!.querySelector("ha-date-input")!;
  }

  private _selectedValueChanged(ev): void {
    const stateObj = this.hass!.states[this._config!.entity];

    const time =
      this._timeInputEl !== null
        ? this._timeInputEl.value.trim() + ":00"
        : undefined;

    const date =
      this._dateInputEl !== null ? this._dateInputEl.value : undefined;

    if (time !== stateObj.state) {
      setInputDateTimeValue(this.hass!, stateObj.entity_id, time, date);
    }

    ev.target.blur();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-input-datetime-entity-row": HuiInputDatetimeEntityRow;
  }
}
