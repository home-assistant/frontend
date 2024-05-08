import { HassEntity } from "home-assistant-js-websocket/dist/types";
import {
  css,
  html,
  LitElement,
  PropertyValues,
  nothing,
  CSSResultArray,
} from "lit";
import { mdiSolarPower } from "@mdi/js";
import { customElement, property, state } from "lit/decorators";
import { ElecRoute } from "@davethompson/elec-sankey";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { isValidEntityId } from "../../../common/entity/valid_entity_id";
import "../../../components/ha-card";
import type { HomeAssistant } from "../../../types";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import type { LovelaceCard } from "../types";
import type { PowerFlowCardConfig } from "./types";
import "../../../components/chart/ha-elec-sankey";
import { hasConfigChanged } from "../common/has-changed";

@customElement("hui-power-flow-card")
class HuiPowerFlowCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: PowerFlowCardConfig;

  public getCardSize(): number {
    return 3;
  }

  public setConfig(config: PowerFlowCardConfig): void {
    if (
      !config.power_from_grid_entity &&
      !config.power_to_grid_entity &&
      !config.generation_entities &&
      !config.consumer_entities
    ) {
      throw new Error("Must specify at least one entity");
    }
    if (config.power_from_grid_entity) {
      if (!isValidEntityId(config.power_from_grid_entity)) {
        throw new Error("Invalid power from grid entity specified");
      }
      // @todo consider adding more config checks here.
      this._config = { ...config };
    }
  }

  protected render() {
    if (!this._config || !this.hass) {
      return nothing;
    }
    let gridInRoute: ElecRoute | null = null;
    if (this._config.power_from_grid_entity) {
      const stateObj = this.hass.states[this._config.power_from_grid_entity];
      if (!stateObj) {
        return html`
          <hui-warning>
            ${createEntityNotFoundWarning(
              this.hass,
              this._config.power_from_grid_entity
            )}
          </hui-warning>
        `;
      }
      const name = computeStateName(stateObj);
      gridInRoute = {
        id: this._config.power_from_grid_entity,
        text: name,
        rate: Number(stateObj.state),
      };
    }

    let gridOutRoute: ElecRoute | null = null;
    if (this._config.power_to_grid_entity) {
      const stateObj = this.hass.states[this._config.power_to_grid_entity];
      if (!stateObj) {
        return html`
          <hui-warning>
            ${createEntityNotFoundWarning(
              this.hass,
              this._config.power_to_grid_entity
            )}
          </hui-warning>
        `;
      }
      const name = computeStateName(stateObj);
      gridOutRoute = {
        id: this._config.power_to_grid_entity,
        text: name,
        rate: Number(stateObj.state),
      };
    }

    const generationInRoutes: { [id: string]: ElecRoute } = {};
    if (this._config.generation_entities) {
      for (const entity of this._config.generation_entities) {
        const stateObj = this.hass.states[entity];
        if (!stateObj) {
          return html`
            <hui-warning>
              ${createEntityNotFoundWarning(this.hass, entity)}
            </hui-warning>
          `;
        }
        const name = computeStateName(stateObj);
        generationInRoutes[entity] = {
          id: entity,
          text: name,
          rate: Number(stateObj.state),
          icon: mdiSolarPower,
        };
      }
    }

    const consumerRoutes: { [id: string]: ElecRoute } = {};
    if (this._config.consumer_entities) {
      for (const entity of this._config.consumer_entities) {
        const stateObj = this.hass.states[entity];
        if (!stateObj) {
          return html`
            <hui-warning>
              ${createEntityNotFoundWarning(this.hass, entity)}
            </hui-warning>
          `;
        }
        const name = computeStateName(stateObj);
        consumerRoutes[entity] = {
          id: entity,
          text: name,
          rate: Number(stateObj.state),
        };
      }
    }
    return html`
      <ha-card>
        <ha-elec-sankey
          .hass=${this.hass}
          .unit=${"W"}
          .gridInRoute=${gridInRoute || undefined}
          .gridOutRoute=${gridOutRoute || undefined}
          .generationInRoutes=${generationInRoutes}
          .consumerRoutes=${consumerRoutes}
        ></ha-elec-sankey>
      </ha-card>
    `;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (hasConfigChanged(this, changedProps)) {
      return true;
    }

    if (!changedProps.has("hass")) {
      return false;
    }
    const oldHass = changedProps.get("hass") as HomeAssistant;
    const newHass = this.hass as HomeAssistant;

    if (this._config) {
      for (const id of [
        this._config.power_from_grid_entity || [],
        this._config.power_to_grid_entity || [],
        ...(this._config.generation_entities || []),
        ...(this._config.consumer_entities || []),
      ]) {
        const oldState = oldHass.states[id] as HassEntity | undefined;
        const newState = newHass.states[id] as HassEntity | undefined;

        if (oldState !== newState) {
          return true;
        }
      }
    }
    return false;
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (!this._config || !this.hass) {
      return;
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    const oldConfig = changedProps.get("_config") as
      | PowerFlowCardConfig
      | undefined;

    if (
      !oldHass ||
      !oldConfig ||
      oldHass.themes !== this.hass.themes ||
      oldConfig.theme !== this._config.theme
    ) {
      applyThemesOnElement(this, this.hass.themes, this._config.theme);
    }
  }

  static styles: CSSResultArray = [
    css`
      ha-card {
        height: 100%;
        padding: 16px;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        box-sizing: border-box;
      }
      ha-card:focus {
        outline: none;
      }
      ha-elec-sankey {
        --generation-color: var(--energy-solar-color);
        --grid-in-color: var(--energy-grid-consumption-color);
      }
      .name {
        text-align: center;
        line-height: initial;
        color: var(--primary-text-color);
        width: 100%;
        font-size: 15px;
        margin-top: 8px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-power-flow-card": HuiPowerFlowCard;
  }
}
