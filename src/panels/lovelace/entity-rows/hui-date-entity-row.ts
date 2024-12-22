import { html, LitElement, nothing, PropertyValues, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-date-input";
import { isUnavailableState, UNAVAILABLE } from "../../../data/entity";
import { setDateValue } from "../../../data/date";
import type { HomeAssistant } from "../../../types";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import "../components/hui-generic-entity-row";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import type { EntityConfig, LovelaceRow } from "./types";

@customElement("hui-date-entity-row")
class HuiDateEntityRow extends LitElement implements LovelaceRow {
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
        <ha-date-input
          .locale=${this.hass.locale}
          .disabled=${unavailable}
          .value=${isUnavailableState(stateObj.state)
            ? undefined
            : stateObj.state}
          @value-changed=${this._dateChanged}
        >
        </ha-date-input>
      </hui-generic-entity-row>
    `;
  }

  private _dateChanged(ev: CustomEvent<{ value: string }>): void {
    if (ev.detail.value) {
      setDateValue(this.hass!, this._config!.entity, ev.detail.value);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-date-entity-row": HuiDateEntityRow;
  }
}
