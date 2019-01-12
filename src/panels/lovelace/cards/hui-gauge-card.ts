import {
  html,
  LitElement,
  PropertyDeclarations,
  PropertyValues,
} from "@polymer/lit-element";
import { TemplateResult } from "lit-html";
import { styleMap } from "lit-html/directives/styleMap";

import "../../../components/ha-card";
import { LovelaceCardConfig } from "../../../data/lovelace";
import { HomeAssistant } from "../../../types";
import { fireEvent } from "../../../common/dom/fire_event";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import isValidEntityId from "../../../common/entity/valid_entity_id";
import applyThemesOnElement from "../../../common/dom/apply_themes_on_element";
import computeStateName from "../../../common/entity/compute_state_name";

import { LovelaceCard, LovelaceCardEditor } from "../types";
import {
  createErrorCardConfig,
  createErrorCardElement,
} from "./hui-error-card";

export interface SeverityConfig {
  green?: number;
  yellow?: number;
  red?: number;
}

export interface Config extends LovelaceCardConfig {
  entity: string;
  name?: string;
  unit?: string;
  min?: number;
  max?: number;
  severity?: SeverityConfig;
  theme?: string;
}

export const severityMap = {
  red: "var(--label-badge-red)",
  green: "var(--label-badge-green)",
  yellow: "var(--label-badge-yellow)",
  normal: "var(--label-badge-blue)",
};

class HuiGaugeCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import(/* webpackChunkName: "hui-gauge-card-editor" */ "../editor/config-elements/hui-gauge-card-editor");
    return document.createElement("hui-gauge-card-editor");
  }
  public static getStubConfig(): object {
    return {};
  }

  public hass?: HomeAssistant;
  private _config?: Config;
  private _updated?: boolean;

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      _config: {},
    };
  }

  public getCardSize(): number {
    return 2;
  }

  public setConfig(config: Config): void {
    if (!config || !config.entity) {
      throw new Error("Invalid card configuration");
    }
    if (!isValidEntityId(config.entity)) {
      throw new Error("Invalid Entity");
    }
    this._config = { min: 0, max: 100, theme: "default", ...config };
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
    let state;
    let error;

    if (!stateObj) {
      error = "Entity not available: " + this._config.entity;
    } else {
      state = Number(stateObj.state);

      if (isNaN(state)) {
        error = "Entity is non-numeric: " + this._config.entity;
      }
    }

    if (error) {
      return html`
        ${createErrorCardElement(createErrorCardConfig(error, this._config))}
      `;
    }

    return html`
      ${this.renderStyle()}
      <ha-card @click="${this._handleClick}">
        ${
          error
            ? html`
                <div class="not-found">${error}</div>
              `
            : html`
                <div class="container">
                  <div class="gauge-a"></div>
                  <div class="gauge-b"></div>
                  <div
                    class="gauge-c"
                    style="${
                      styleMap({
                        transform: `rotate(${this._translateTurn(state)}turn)`,
                        "background-color": this._computeSeverity(state),
                      })
                    }"
                  ></div>
                  <div class="gauge-data">
                    <div id="percent">
                      ${stateObj.state}
                      ${
                        this._config.unit ||
                          stateObj.attributes.unit_of_measurement ||
                          ""
                      }
                    </div>
                    <div id="name">
                      ${this._config.name || computeStateName(stateObj)}
                    </div>
                  </div>
                </div>
              `
        }
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

    if (!oldHass || oldHass.themes !== this.hass.themes) {
      applyThemesOnElement(this, this.hass.themes, this._config.theme);
    }
  }

  private _setBaseUnit(): void {
    if (!this.isConnected || !this._updated) {
      return;
    }
    const baseUnit = this._computeBaseUnit();
    if (baseUnit === "0px") {
      return;
    }
    (this.shadowRoot!.querySelector(
      "ha-card"
    )! as HTMLElement).style.setProperty("--base-unit", baseUnit);
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

  private _translateTurn(value: number): number {
    const { min, max } = this._config!;
    const maxTurnValue = Math.min(Math.max(value, min!), max!);
    return (5 * (maxTurnValue - min!)) / (max! - min!) / 10;
  }

  private _computeBaseUnit(): string {
    return this.clientWidth < 200 ? this.clientWidth / 5 + "px" : "50px";
  }

  private _handleClick(): void {
    fireEvent(this, "hass-more-info", { entityId: this._config!.entity });
  }

  private renderStyle(): TemplateResult {
    return html`
      <style>
        ha-card {
          --base-unit: 50px;
          height: calc(var(--base-unit) * 3);
          position: relative;
          cursor: pointer;
        }
        .container {
          width: calc(var(--base-unit) * 4);
          height: calc(var(--base-unit) * 2);
          position: absolute;
          top: calc(var(--base-unit) * 1.5);
          left: 50%;
          overflow: hidden;
          text-align: center;
          transform: translate(-50%, -50%);
        }
        .gauge-a {
          z-index: 1;
          position: absolute;
          background-color: var(--primary-background-color);
          width: calc(var(--base-unit) * 4);
          height: calc(var(--base-unit) * 2);
          top: 0%;
          border-radius: calc(var(--base-unit) * 2.5)
            calc(var(--base-unit) * 2.5) 0px 0px;
        }
        .gauge-b {
          z-index: 3;
          position: absolute;
          background-color: var(--paper-card-background-color);
          width: calc(var(--base-unit) * 2.5);
          height: calc(var(--base-unit) * 1.25);
          top: calc(var(--base-unit) * 0.75);
          margin-left: calc(var(--base-unit) * 0.75);
          margin-right: auto;
          border-radius: calc(var(--base-unit) * 2.5)
            calc(var(--base-unit) * 2.5) 0px 0px;
        }
        .gauge-c {
          z-index: 2;
          position: absolute;
          background-color: var(--label-badge-blue);
          width: calc(var(--base-unit) * 4);
          height: calc(var(--base-unit) * 2);
          top: calc(var(--base-unit) * 2);
          margin-left: auto;
          margin-right: auto;
          border-radius: 0px 0px calc(var(--base-unit) * 2)
            calc(var(--base-unit) * 2);
          transform-origin: center top;
          transition: all 1.3s ease-in-out;
        }
        .gauge-data {
          z-index: 4;
          color: var(--primary-text-color);
          line-height: calc(var(--base-unit) * 0.3);
          position: absolute;
          width: calc(var(--base-unit) * 4);
          height: calc(var(--base-unit) * 2.1);
          top: calc(var(--base-unit) * 1.2);
          margin-left: auto;
          margin-right: auto;
          transition: all 1s ease-out;
        }
        .gauge-data #percent {
          font-size: calc(var(--base-unit) * 0.55);
        }
        .gauge-data #name {
          padding-top: calc(var(--base-unit) * 0.15);
          font-size: calc(var(--base-unit) * 0.3);
        }
        .not-found {
          flex: 1;
          background-color: yellow;
          padding: 8px;
        }
      </style>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-gauge-card": HuiGaugeCard;
  }
}

customElements.define("hui-gauge-card", HuiGaugeCard);
