import { html, LitElement, nothing, PropertyValues, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-date-input";
import { isUnavailableState, UNAVAILABLE } from "../../../data/entity";
import { setTimeValue } from "../../../data/time";
import type { HomeAssistant } from "../../../types";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import "../components/hui-generic-entity-row";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import type { EntityConfig, LovelaceRow } from "./types";
import "../../../components/ha-time-input";

@customElement("hui-time-entity-row")
class HuiTimeEntityRow extends LitElement implements LovelaceRow {
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
        <hui-warning>
          ${createEntityNotFoundWarning(this.hass, this._config.entity)}
        </hui-warning>
      `;
    }

    const unavailable = stateObj.state === UNAVAILABLE;

    return html`
      <hui-generic-entity-row .hass=${this.hass} .config=${this._config}>
        <ha-time-input
          .value=${isUnavailableState(stateObj.state)
            ? undefined
            : stateObj.state}
          .locale=${this.hass.locale}
          .disabled=${unavailable}
          @value-changed=${this._timeChanged}
          @click=${this._stopEventPropagation}
        ></ha-time-input>
      </hui-generic-entity-row>
    `;
  }

  private _stopEventPropagation(ev: Event): void {
    ev.stopPropagation();
  }

  private _timeChanged(ev: CustomEvent<{ value: string }>): void {
    if (ev.detail.value) {
      const stateObj = this.hass!.states[this._config!.entity];
      setTimeValue(this.hass!, stateObj.entity_id, ev.detail.value);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-time-entity-row": HuiTimeEntityRow;
  }
}
