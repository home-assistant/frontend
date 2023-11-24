import { mdiDotsVertical } from "@mdi/js";
import {
  CSSResultGroup,
  LitElement,
  PropertyValues,
  css,
  html,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { stateColorCss } from "../../../common/entity/state_color";
import "../../../components/ha-card";
import "../../../components/ha-icon-button";
import { ClimateEntity } from "../../../data/climate";
import "../../../state-control/climate/ha-state-control-climate-temperature";
import { HomeAssistant } from "../../../types";
import { findEntities } from "../common/find-entities";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import "../card-features/hui-card-features";
import { LovelaceCard, LovelaceCardEditor } from "../types";
import { ThermostatCardConfig } from "./types";

@customElement("hui-thermostat-card")
export class HuiThermostatCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("../editor/config-elements/hui-thermostat-card-editor");
    return document.createElement("hui-thermostat-card-editor");
  }

  public static getStubConfig(
    hass: HomeAssistant,
    entities: string[],
    entitiesFallback: string[]
  ): ThermostatCardConfig {
    const includeDomains = ["climate"];
    const maxEntities = 1;
    const foundEntities = findEntities(
      hass,
      maxEntities,
      entities,
      entitiesFallback,
      includeDomains
    );

    return { type: "thermostat", entity: foundEntities[0] || "" };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: ThermostatCardConfig;

  public getCardSize(): number {
    return 7;
  }

  public setConfig(config: ThermostatCardConfig): void {
    if (!config.entity || config.entity.split(".")[0] !== "climate") {
      throw new Error("Specify an entity from within the climate domain");
    }

    this._config = config;
  }

  private _handleMoreInfo() {
    fireEvent(this, "hass-more-info", {
      entityId: this._config!.entity,
    });
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    if (
      !this._config ||
      !this.hass ||
      (!changedProps.has("hass") && !changedProps.has("_config"))
    ) {
      return;
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    const oldConfig = changedProps.get("_config") as
      | ThermostatCardConfig
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

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }
    const stateObj = this.hass.states[this._config.entity] as ClimateEntity;

    if (!stateObj) {
      return html`
        <hui-warning>
          ${createEntityNotFoundWarning(this.hass, this._config.entity)}
        </hui-warning>
      `;
    }

    const name = this._config!.name || computeStateName(stateObj);

    const color = stateColorCss(stateObj);

    return html`
      <ha-card>
        <p class="title">${name}</p>
        <ha-state-control-climate-temperature
          show-current
          .hass=${this.hass}
          .stateObj=${stateObj}
        ></ha-state-control-climate-temperature>
        <ha-icon-button
          class="more-info"
          .label=${this.hass!.localize(
            "ui.panel.lovelace.cards.show_more_info"
          )}
          .path=${mdiDotsVertical}
          @click=${this._handleMoreInfo}
          tabindex="0"
        ></ha-icon-button>
        <hui-card-features
          style=${styleMap({
            "--feature-color": color,
          })}
          .hass=${this.hass}
          .stateObj=${stateObj}
          .features=${this._config.features}
        ></hui-card-features>
      </ha-card>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-card {
        height: 100%;
        position: relative;
        overflow: hidden;
        padding: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
      }

      .title {
        width: 100%;
        font-size: 18px;
        line-height: 24px;
        padding: 12px 36px 16px 36px;
        margin: 0;
        text-align: center;
        box-sizing: border-box;
      }

      ha-state-control-climate-temperature {
        width: 100%;
        max-width: 344px; /* 12px + 12px + 320px */
        padding: 0 12px 12px 12px;
        box-sizing: border-box;
      }

      .more-info {
        position: absolute;
        cursor: pointer;
        top: 0;
        right: 0;
        inset-inline-end: 0px;
        inset-inline-start: initial;
        border-radius: 100%;
        color: var(--secondary-text-color);
        direction: var(--direction);
      }

      hui-card-features {
        width: 100%;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-thermostat-card": HuiThermostatCard;
  }
}
