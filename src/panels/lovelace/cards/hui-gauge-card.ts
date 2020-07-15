import { HassEntity } from "home-assistant-js-websocket/dist/types";
import Gauge from "svg-gauge";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  internalProperty,
  PropertyValues,
  TemplateResult,
  query,
} from "lit-element";

import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { isValidEntityId } from "../../../common/entity/valid_entity_id";
import "../../../components/ha-card";
import type { HomeAssistant } from "../../../types";
import { findEntities } from "../common/find-entites";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import type { LovelaceCard, LovelaceCardEditor } from "../types";
import type { GaugeCardConfig } from "./types";

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

  @property({ attribute: false }) public hass?: HomeAssistant;

  @internalProperty() private _config?: GaugeCardConfig;

  @internalProperty() private _gauge?: any;

  @query("#gauge") private _gaugeElement!: HTMLDivElement;

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
    this._initGauge();
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass) {
      return html``;
    }

    const stateObj = this.hass.states[this._config.entity];

    if (!stateObj) {
      return html`
        <hui-warning>
          ${createEntityNotFoundWarning(this.hass, this._config.entity)}
        </hui-warning>
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
      <ha-card @click=${this._handleClick} tabindex="0">
        <div id="gauge"></div>
        <div class="name">
          ${this._config.name || computeStateName(stateObj)}
        </div>
      </ha-card>
    `;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  protected firstUpdated(changedProps: PropertyValues): void {
    super.firstUpdated(changedProps);
    if (!this._gauge) {
      this._initGauge();
    }
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
    const oldState = oldHass?.states[this._config.entity];
    const stateObj = this.hass.states[this._config.entity];
    if (oldState?.state !== stateObj.state) {
      this._gauge.setValueAnimated(stateObj.state, 1);
    }
  }

  private _initGauge() {
    if (!this._gaugeElement || !this._config || !this.hass) {
      return;
    }
    if (this._gauge) {
      this._gaugeElement.removeChild(this._gaugeElement.lastChild!);
      this._gauge = undefined;
    }
    this._gauge = Gauge(this._gaugeElement, {
      min: this._config.min,
      max: this._config.max,
      dialStartAngle: 180,
      dialEndAngle: 0,
      viewBox: "0 0 100 55",
      label: (value) => `${Math.round(value)}
      ${
        this._config!.unit ||
        this.hass?.states[this._config!.entity].attributes
          .unit_of_measurement ||
        ""
      }`,
      color: (value) => {
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

        if (value >= sortable[0][1] && value < sortable[1][1]) {
          return severityMap[sortable[0][0]];
        }
        if (value >= sortable[1][1] && value < sortable[2][1]) {
          return severityMap[sortable[1][0]];
        }
        if (value >= sortable[2][1]) {
          return severityMap[sortable[2][0]];
        }
        return severityMap.normal;
      },
    });
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
        cursor: pointer;
        height: 100%;
        overflow: hidden;
        padding: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        box-sizing: border-box;
      }

      ha-card:focus {
        outline: none;
        background: var(--divider-color);
      }
      #gauge {
        width: 100%;
        max-width: 300px;
      }
      .dial {
        stroke: #ccc;
        stroke-width: 15;
      }
      .value {
        stroke-width: 15;
      }
      .value-text {
        fill: var(--primary-text-color);
        font-size: var(--gauge-value-font-size, 1.1em);
        transform: translate(0, -5px);
        font-family: inherit;
      }
      .name {
        text-align: center;
        line-height: initial;
        color: var(--primary-text-color);
        width: 100%;
        font-size: 15px;
      }

      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-gauge-card": HuiGaugeCard;
  }
}
