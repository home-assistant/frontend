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
  @property() private _config?: GaugeCardConfig;

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

    const sliderBarColor = this._computeSeverity(state);

    return html`
      <ha-card
        @click=${this._handleClick}
        tabindex="0"
        style=${styleMap({
          "--round-slider-bar-color": sliderBarColor,
          "--font-size":
            this.clientWidth > 200
              ? "14px"
              : this.clientWidth > 125
              ? "12px"
              : "10px",
          "--round-slider-path-width":
            this.clientWidth < 200 ? this.clientWidth / 7 + "px" : "35px",
        })}
      >
        <round-slider
          readonly
          arcLength="180"
          startAngle="180"
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

  private _computeSeverity(numberValue: number): string {
    const sections = this._config!.severity;

    if (!sections) {
      return severityMap.normal;
    }

    const sectionsArray = Object.keys(sections);
    const sortable = sectionsArray.map((severity) => [
      severity,
      sections[severity],
    ]);

    for (const severity of sortable) {
      if (severityMap[severity[0]] == null || isNaN(severity[1])) {
        return severityMap.normal;
      }
    }
    sortable.sort((a, b) => a[1] - b[1]);

    if (numberValue >= sortable[0][1] && numberValue < sortable[1][1]) {
      return severityMap[sortable[0][0]];
    }
    if (numberValue >= sortable[1][1] && numberValue < sortable[2][1]) {
      return severityMap[sortable[1][0]];
    }
    if (numberValue >= sortable[2][1]) {
      return severityMap[sortable[2][0]];
    }
    return severityMap.normal;
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

        --value-font-size: calc(var(--font-size) * 2);
        --name-font-size: var(--font-size);
        --name-padding-top: 5%;
        --slider-width: 50%;
        --gauge-data-top: calc((var(--font-size) * -2));
        --gauge-data-bottom: var(--font-size);
        --round-slider-path-color: var(--disabled-text-color);
        --round-slider-linecap: "butt";
      }

      ha-card:focus {
        outline: none;
        background: var(--divider-color);
      }

      round-slider {
        max-width: 200px;
      }

      .gauge-data {
        line-height: 1;
        text-align: center;
        position: relative;
        color: var(--primary-text-color);
        margin-top: var(--gauge-data-top);
        margin-bottom: var(--gauge-data-bottom);
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
