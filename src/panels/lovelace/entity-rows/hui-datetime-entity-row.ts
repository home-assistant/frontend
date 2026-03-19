import { format } from "date-fns";
import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-date-input";
import "../../../components/ha-time-input";
import { setDateTimeValue } from "../../../data/datetime";
import { isUnavailableState, UNAVAILABLE } from "../../../data/entity/entity";
import type { HomeAssistant, ValueChangedEvent } from "../../../types";
import { computeLovelaceEntityName } from "../common/entity/compute-lovelace-entity-name";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import "../components/hui-generic-entity-row";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import type { EntityConfig, LovelaceRow } from "./types";

@customElement("hui-datetime-entity-row")
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

  protected render(): TemplateResult | typeof nothing {
    if (!this._config || !this.hass) {
      return nothing;
    }

    const stateObj = this.hass.states[this._config.entity];

    if (!stateObj) {
      return html`
        <hui-warning .hass=${this.hass}>
          ${createEntityNotFoundWarning(this.hass, this._config.entity)}
        </hui-warning>
      `;
    }

    const unavailable = stateObj.state === UNAVAILABLE;

    const dateObj = isUnavailableState(stateObj.state)
      ? undefined
      : new Date(stateObj.state);
    const time = dateObj ? format(dateObj, "HH:mm:ss") : undefined;
    const date = dateObj ? format(dateObj, "yyyy-MM-dd") : undefined;

    const name = computeLovelaceEntityName(
      this.hass!,
      stateObj,
      this._config.name
    );

    return html`
      <hui-generic-entity-row
        .hass=${this.hass}
        .config=${this._config}
        hide-name
      >
        <div>
          <ha-date-input
            .label=${name}
            .locale=${this.hass.locale}
            .value=${date}
            .disabled=${unavailable}
            @value-changed=${this._dateChanged}
          >
          </ha-date-input>
          <ha-time-input
            .value=${time}
            .disabled=${unavailable}
            .locale=${this.hass.locale}
            @value-changed=${this._timeChanged}
            @click=${this._stopEventPropagation}
          ></ha-time-input>
        </div>
      </hui-generic-entity-row>
    `;
  }

  private _stopEventPropagation(ev: Event): void {
    ev.stopPropagation();
  }

  private _timeChanged(ev: ValueChangedEvent<string>): void {
    if (ev.detail.value) {
      const stateObj = this.hass!.states[this._config!.entity];
      const dateObj = new Date(stateObj.state);
      const newTime = ev.detail.value.split(":").map(Number);
      dateObj.setHours(newTime[0], newTime[1], newTime[2]);

      setDateTimeValue(this.hass!, stateObj.entity_id, dateObj);
    }
  }

  private _dateChanged(ev: ValueChangedEvent<string>): void {
    if (ev.detail.value) {
      const stateObj = this.hass!.states[this._config!.entity];
      const dateObj = new Date(stateObj.state);
      const newDate = ev.detail.value.split("-").map(Number);
      dateObj.setFullYear(newDate[0], newDate[1] - 1, newDate[2]);

      setDateTimeValue(this.hass!, stateObj.entity_id, dateObj);
    }
  }

  static styles = css`
    ha-time-input {
      margin-left: 4px;
      margin-inline-start: 4px;
      margin-inline-end: initial;
      direction: var(--direction);
    }
    div {
      display: flex;
      justify-content: flex-end;
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-datetime-entity-row": HuiInputDatetimeEntityRow;
  }
}
