import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-date-input";
import { isUnavailableState } from "../../../data/entity";
import { setDateValue, stateToIsoDateString } from "../../../data/date";
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

    return html`
      <hui-generic-entity-row
        .hass=${this.hass}
        .config=${this._config}
        hideName="true"
      >
        <ha-date-input
          .locale=${this.hass.locale}
          .disabled=${isUnavailableState.includes(stateObj.state)}
          .value=${isUnavailableState.includes(stateObj.state)
            ? this.hass.localize(`state.default.${stateObj.state}`)
            : stateToIsoDateString(stateObj)}
          @value-changed=${this._dateChanged}
        >
        </ha-date-input>
      </hui-generic-entity-row>
    `;
  }

  private _dateChanged(ev: CustomEvent<{ value: string }>): void {
    const stateObj = this.hass!.states[this._config!.entity];

    setDateValue(this.hass!, stateObj.entity_id, ev.detail.value);
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
    "hui-date-entity-row": HuiDateEntityRow;
  }
}
