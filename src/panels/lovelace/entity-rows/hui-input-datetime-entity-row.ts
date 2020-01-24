import {
  html,
  LitElement,
  TemplateResult,
  property,
  PropertyValues,
  customElement,
} from "lit-element";

import "../components/hui-generic-entity-row";
import "../../../components/paper-time-input.js";
// tslint:disable-next-line:no-duplicate-imports
import { PaperTimeInput } from "../../../components/paper-time-input.js";
import "../../../components/ha-date-input";
// tslint:disable-next-line:no-duplicate-imports
import { HaDateInput } from "../../../components/ha-date-input";

import { HomeAssistant } from "../../../types";
import { LovelaceRow, EntityConfig } from "./types";
import { setInputDateTimeValue } from "../../../data/input_datetime";
import { hasConfigOrEntityChanged } from "../common/has-changed";

@customElement("hui-input-datetime-entity-row")
class HuiInputDatetimeEntityRow extends LitElement implements LovelaceRow {
  @property() public hass?: HomeAssistant;
  @property() private _config?: EntityConfig;

  public setConfig(config: EntityConfig): void {
    if (!config) {
      throw new Error("Configuration error");
    }
    this._config = config;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  protected render(): TemplateResult | void {
    if (!this._config || !this.hass) {
      return html``;
    }

    const stateObj = this.hass.states[this._config.entity];

    if (!stateObj) {
      return html`
        <hui-warning
          >${this.hass.localize(
            "ui.panel.lovelace.warning.entity_not_found",
            "entity",
            this._config.entity
          )}</hui-warning
        >
      `;
    }

    return html`
      <hui-generic-entity-row .hass="${this.hass}" .config="${this._config}">
        ${stateObj.attributes.has_date
          ? html`
              <ha-date-input
                .year=${stateObj.attributes.year}
                .month=${("0" + stateObj.attributes.month).slice(-2)}
                .day=${("0" + stateObj.attributes.day).slice(-2)}
                @change=${this._selectedValueChanged}
                @click=${this._stopEventPropagation}
              ></ha-date-input>
              ${stateObj.attributes.has_time ? "," : ""}
            `
          : ``}
        ${stateObj.attributes.has_time
          ? html`
              <paper-time-input
                .hour=${stateObj.state === "unknown"
                  ? ""
                  : ("0" + stateObj.attributes.hour).slice(-2)}
                .min=${stateObj.state === "unknown"
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
