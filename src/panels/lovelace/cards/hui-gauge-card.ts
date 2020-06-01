import { HassEntity } from "home-assistant-js-websocket/dist/types";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { styleMap } from "lit-html/directives/style-map";
import "@thomasloven/round-slider";

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
import { debounce } from "../../../common/util/debounce";
import { installResizeObserver } from "../common/install-resize-observer";

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

  private _resizeObserver?: ResizeObserver;

  public connectedCallback(): void {
    super.connectedCallback();
    this.updateComplete.then(() => this._attachObserver());
  }

  public disconnectedCallback(): void {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
  }

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

    const sliderBarColor = this._computeSeverity(state);

    let value: number | undefined;

    if (this._config.max === null || isNaN(this._config.max!)) {
      value = undefined;
    } else {
      value = Math.min(this._config.max!, state);
    }

    return html`
      <ha-card
        @click=${this._handleClick}
        tabindex="0"
        style=${styleMap({
          "--round-slider-bar-color": sliderBarColor,
        })}
      >
        <round-slider
          readonly
          arcLength="180"
          startAngle="180"
          .value=${value}
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
    this._measureCard();
    this._attachObserver();
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

  private async _attachObserver(): Promise<void> {
    if (!this._resizeObserver) {
      await installResizeObserver();
      this._resizeObserver = new ResizeObserver(
        debounce(() => this._measureCard(), 250, false)
      );
    }
    const card = this.shadowRoot!.querySelector("ha-card");
    // If we show an error or warning there is no ha-card
    if (!card) {
      return;
    }
    this._resizeObserver.observe(card);
  }

  private _measureCard() {
    if (!this.isConnected) {
      return;
    }

    if (this.offsetWidth < 200) {
      this.setAttribute("narrow", "");
    } else {
      this.removeAttribute("narrow");
    }
    if (this.offsetWidth < 150) {
      this.setAttribute("veryNarrow", "");
    } else {
      this.removeAttribute("veryNarrow");
    }
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

      round-slider {
        max-width: 200px;
        --round-slider-path-width: 35px;
        --round-slider-path-color: var(--primary-background-color);
        --round-slider-linecap: "butt";
      }

      .gauge-data {
        text-align: center;
        line-height: initial;
        color: var(--primary-text-color);
        margin-top: -26px;
        width: 100%;
      }

      .gauge-data .percent {
        white-space: nowrap;
        font-size: 28px;
      }

      .gauge-data .name {
        font-size: 15px;
      }

      /* ============= NARROW ============= */

      :host([narrow]) ha-card {
        padding: 8px;
      }

      :host([narrow]) round-slider {
        --round-slider-path-width: 22px;
      }

      :host([narrow]) .gauge-data {
        margin-top: -22px;
      }

      :host([narrow]) .gauge-data .percent {
        font-size: 24px;
      }

      :host([narrow]) .gauge-data .name {
        font-size: 14px;
      }

      /* ============= VERY NARROW ============= */

      :host([narrow]) ha-card {
        padding: 4px;
      }

      :host([veryNarrow]) round-slider {
        --round-slider-path-width: 15px;
      }

      :host([veryNarrow]) .gauge-data {
        margin-top: -16px;
      }

      :host([veryNarrow]) .gauge-data .percent {
        font-size: 16px;
      }

      :host([veryNarrow]) .gauge-data .name {
        font-size: 12px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-gauge-card": HuiGaugeCard;
  }
}
