import {
  html,
  LitElement,
  TemplateResult,
  property,
  CSSResult,
  css,
  customElement,
  PropertyValues,
} from "lit-element";

import "../components/hui-generic-entity-row";
import "../components/hui-warning";

import { computeStateDisplay } from "../../../common/entity/compute_state_display";
import { HomeAssistant } from "../../../types";
import { LovelaceRow, EntityConfig } from "./types";
import { hasConfigOrEntityChanged } from "../common/has-changed";

@customElement("hui-person-entity-row")
class HuiPersonEntityRow extends LitElement implements LovelaceRow {
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

  protected render(): TemplateResult {
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
      <hui-generic-entity-row
        .hass=${this.hass}
        .config=${this._config}
        .showSecondary=${false}
      >
        <div class="state">
          ${computeStateDisplay(
            this.hass!.localize,
            stateObj,
            this.hass.language
          )}
        </div>
        ${this._computeBatteryDisplay()}
      </hui-generic-entity-row>
    `;
  }

  private _computeBatteryDisplay(): TemplateResult {
    const sourceStateObj = this.hass!.states[
      this.hass!.states[this._config!.entity].attributes.source
    ];

    if (
      !sourceStateObj ||
      (!sourceStateObj.attributes.battery_level &&
        !sourceStateObj.attributes.battery)
    ) {
      return html``;
    }

    const batteryLevel =
      sourceStateObj.attributes.battery_level ||
      sourceStateObj.attributes.battery;

    return html`
      <div slot="secondary">
        <ha-icon icon="mdi:battery"></ha-icon>
        ${batteryLevel}%
      </div>
    `;
  }

  static get styles(): CSSResult {
    return css`
      .state {
        text-align: right;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-person-entity-row": HuiPersonEntityRow;
  }
}
