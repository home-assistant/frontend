import {
  html,
  LitElement,
  TemplateResult,
  css,
  CSSResult,
  property,
  customElement,
  PropertyValues,
} from "lit-element";

import "../components/hui-generic-entity-row";
import "../components/hui-warning";

import { LovelaceRow, EntityConfig } from "./types";
import { HomeAssistant } from "../../../types";
import { HassEntity } from "home-assistant-js-websocket";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import { classMap } from "lit-html/directives/class-map";
import { actionHandler } from "../common/directives/action-handler-directive";
import { hasAction } from "../common/has-action";
import { ifDefined } from "lit-html/directives/if-defined";
import { DOMAINS_HIDE_MORE_INFO } from "../../../common/const";
import { EntitiesCardEntityConfig } from "../cards/types";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeStateName } from "../../../common/entity/compute_state_name";

@customElement("hui-weather-entity-row")
class HuiWeatherEntityRow extends LitElement implements LovelaceRow {
  @property() public hass?: HomeAssistant;

  @property() private _config?: EntitiesCardEntityConfig;

  public setConfig(config: EntitiesCardEntityConfig): void {
    if (!config || !config.entity) {
      throw new Error("Invalid Configuration: 'entity' required");
    }

    this._config = config;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
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
        .hass="${this.hass}"
        .config="${this._config}"
        .showSecondary=${false}
        >${stateObj.attributes.temperature} ${this.getUnit("temperature")}
        <div slot="secondary">
          ${this.hass.localize(`state.weather.${stateObj.state}`) ||
            stateObj.state}
        </div>
        <div>test</div>
      </hui-generic-entity-row>
    `;
  }

  private getUnit(measure: string): string {
    const lengthUnit = this.hass!.config.unit_system.length || "";
    switch (measure) {
      case "air_pressure":
        return lengthUnit === "km" ? "hPa" : "inHg";
      case "length":
        return lengthUnit;
      case "precipitation":
        return lengthUnit === "km" ? "mm" : "in";
      default:
        return this.hass!.config.unit_system[measure] || "";
    }
  }

  static get styles(): CSSResult {
    return css`
      /* :host {
        display: flex;
        align-items: center;
      } */

      .flex {
        flex: 1;
        margin-left: 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        min-width: 0;
      }
      .info {
        flex: 1 0 60px;
      }
      .info,
      .info > * {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .secondary {
        display: block;
        color: var(--secondary-text-color);
        margin-left: 0;
      }

      state-badge {
        flex: 0 0 40px;
      }

      state-badge:focus {
        outline: none;
        background: var(--divider-color);
        border-radius: 100%;
      }

      ha-icon {
        color: var(--paper-item-icon-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-weather-entity-row": HuiWeatherEntityRow;
  }
}
