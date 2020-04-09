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
        <round-slider
          .readonly=${true}
          .arcLength=${180}
          .startAngle=${180}
          .value=${state}
          .min=${this._config.min}
          .max=${this._config.max}
        ></round-slider>
        <div class="gauge-data">
          <div class="percent">
            ${stateObj.state}
            ${this._config.unit ||
              stateObj.attributes.unit_of_measurement ||
              ""}
          </div>
          <div class="name">
            ${this._config.name || computeStateName(stateObj)}
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
      ha-card {
        cursor: pointer;
        height: 100%;
        overflow: hidden;
        padding: 16px 16px 0 16px;
        display: flex;
        align-items: center;
        flex-direction: column;
        box-sizing: border-box;

        --value-font-size: calc(var(--base-unit) * 0.55);
        --name-font-size: calc(var(--base-unit) * 0.3);
        --name-padding-top: calc(var(--base-unit) * 0.15);
        --slider-width: calc(var(--base-unit) * 4);
        --gauge-data-top: calc(var(--base-unit) * -0.5);
      }

      ha-card:focus {
        outline: none;
        background: var(--divider-color);
      }

      round-slider {
        --round-slider-path-width: calc(var(--base-unit) * 0.7);
        --round-slider-path-color: var(--disabled-text-color);
        --round-slider-linecap: "butt";
        width: var(--slider-width);
      }

      .gauge-data {
        line-height: 1;
        text-align: center;
        position: relative;
        color: var(--primary-text-color);
        top: var(--gauge-data-top);
      }

      .gauge-data .percent {
        font-size: var(--value-font-size);
      }

      .gauge-data .name {
        padding-top: var(--name-padding-top);
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
