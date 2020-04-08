import {
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
  css,
  CSSResult,
  property,
  customElement,
} from "lit-element";
import { styleMap } from "lit-html/directives/style-map";
import "@thomasloven/round-slider";

import "../../../components/ha-card";
import "../components/hui-warning";

import { isValidEntityId } from "../../../common/entity/valid_entity_id";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { computeStateName } from "../../../common/entity/compute_state_name";

import { HomeAssistant } from "../../../types";
import { fireEvent } from "../../../common/dom/fire_event";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import { LovelaceCard, LovelaceCardEditor } from "../types";
import { GaugeCardConfig } from "./types";
import { findEntities } from "../common/find-entites";
import { HassEntity } from "home-assistant-js-websocket/dist/types";

export const severityMap = {
  red: "var(--label-badge-red)",
  green: "var(--label-badge-green)",
  yellow: "var(--label-badge-yellow)",
  normal: "var(--label-badge-blue)",
};

@customElement("hui-gauge-card")
class HuiGaugeCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import(
      /* webpackChunkName: "hui-gauge-card-editor" */ "../editor/config-elements/hui-gauge-card-editor"
    );
    return document.createElement("hui-gauge-card-editor");
  }

  public static getStubConfig(
    hass: HomeAssistant,
    entities: string[],
    entitiesFallback: string[]
  ): GaugeCardConfig {
    const includeDomains = ["sensor"];
    const maxEntities = 1;
    const entityFilter = (stateObj: HassEntity): boolean => {
      return !isNaN(Number(stateObj.state));
    };

    const foundEntities = findEntities(
      hass,
      maxEntities,
      entities,
      entitiesFallback,
      includeDomains,
      entityFilter
    );

    return { type: "gauge", entity: foundEntities[0] || "" };
  }

  @property() public hass?: HomeAssistant;
  @property() private _baseUnit = "50px";
  @property() private _config?: GaugeCardConfig;
  private _updated?: boolean;

  public getCardSize(): number {
    return 2;
  }

  public setConfig(config: GaugeCardConfig): void {
    if (!config || !config.entity) {
      throw new Error("Invalid card configuration");
    }
    if (!isValidEntityId(config.entity)) {
      throw new Error("Invalid Entity");
    }
    this._config = { min: 0, max: 100, ...config };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._setBaseUnit();
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

    const state = Number(stateObj.state);

    if (isNaN(state)) {
      return html`
        <hui-warning
          >${this.hass.localize(
            "ui.panel.lovelace.warning.entity_non_numeric",
            "entity",
            this._config.entity
          )}</hui-warning
        >
      `;
    }

    return html`
      <ha-card
        @click=${this._handleClick}
        tabindex="0"
        style=${styleMap({
          "--base-unit": this._baseUnit,
        })}
      >
        <div class="content">
          <div class="controls">
            <div class="slider">
              <round-slider
                .readonly=${true}
                .arcLength=${180}
                .startAngle=${180}
                .value=${state}
                .min=${this._config.min}
                .max=${this._config.max}
              ></round-slider>
            </div>
          </div>
          <div class="gauge-data">
            <div id="percent">
              ${stateObj.state}
              ${this._config.unit ||
                stateObj.attributes.unit_of_measurement ||
                ""}
            </div>
            <div id="name">
              ${this._config.name || computeStateName(stateObj)}
            </div>
          </div>
        </div>
      </ha-card>
    `;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  protected firstUpdated(): void {
    this._updated = true;
    this._setBaseUnit();
    this.classList.add("init");
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (!this._config || !this.hass) {
      return;
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    const oldConfig = changedProps.get("_config") as
      | GaugeCardConfig
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

  private _setBaseUnit(): void {
    if (!this.isConnected || !this._updated) {
      return;
    }
    const baseUnit = this._computeBaseUnit();
    if (baseUnit !== "0px") {
      this._baseUnit = baseUnit;
    }
  }

  private _computeBaseUnit(): string {
    return this.clientWidth < 200 ? this.clientWidth / 5 + "px" : "50px";
  }

  private _handleClick(): void {
    fireEvent(this, "hass-more-info", { entityId: this._config!.entity });
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: block;
      }

      ha-card {
        height: 100%;
        position: relative;
        overflow: hidden;
        /* cursor: pointer;
        padding: 16px;
        height: 100%;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        align-items: center; */
        --value-font-size: calc(var(--base-unit) * 0.55);
        --name-font-size: calc(var(--base-unit) * 0.3);
      }

      /* ha-card:focus {
        outline: none;
        background: var(--divider-color);
      } */

      .content {
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }

      .controls {
        display: flex;
        justify-content: center;
        padding: 16px;
        position: relative;
      }

      .slider {
        /* height: calc(var(--base-unit) * 3);
        width: calc(var(--base-unit) * 4);
        display: flex;
        align-items: center; */
        height: 100%;
        width: 100%;
        position: relative;
        max-width: 250px;
        min-width: 100px;
      }

      round-slider {
        --round-slider-path-width: calc(var(--base-unit) - 10);
        --round-slider-path-color: var(--disabled-text-color);
        --round-slider-linecap: "butt";
        padding-bottom: 10%;
      }

      .gauge-data {
        /* position: absolute;
        top: calc(var(--base-unit) * 2.2);
        color: var(--primary-text-color);
        line-height: 1;
        text-align: center; */
        display: flex-vertical;
        justify-content: center;
        text-align: center;
        padding: 16px;
        margin-top: -60px;
        /* font-size: var(--name-font-size); */
      }

      .init .gauge-data {
        transition: all 1s ease-out;
      }

      .gauge-data #percent {
        font-size: var(--value-font-size);
        /* line-height: 1; */
      }

      .gauge-data #name {
        /* padding-top: calc(var(--base-unit) * 0.15); */
        font-size: var(--name-font-size);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-gauge-card": HuiGaugeCard;
  }
}
