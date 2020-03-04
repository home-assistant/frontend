import {
  html,
  LitElement,
  TemplateResult,
  customElement,
  property,
  css,
  CSSResult,
  PropertyValues,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";

import "../../../components/ha-card";
import "../../../components/state-history-charts";
import "../../../data/ha-state-history-data";

import { getRecentWithCache, CacheConfig } from "../../../data/cached-history";
import { processConfigEntities } from "../common/process-config-entities";
import { HomeAssistant } from "../../../types";
import { HistoryGraphCardConfig } from "./types";
import { LovelaceCard } from "../types";
import { EntityConfig } from "../entity-rows/types";
import { LovelaceConfig } from "../../../data/lovelace";
import { findEntities } from "../common/find-entites";

@customElement("hui-history-graph-card")
export class HuiHistoryGraphCard extends LitElement implements LovelaceCard {
  public static async getConfigElement() {
    await import(
      /* webpackChunkName: "hui-history-graph-card-editor" */ "../editor/config-elements/hui-history-graph-card-editor"
    );
    return document.createElement("hui-history-graph-card-editor");
  }

  public static getStubConfig(
    hass: HomeAssistant,
    lovelaceConfig: LovelaceConfig,
    entities?: string[],
    entitiesFill?: string[]
  ): object {
    const includeDomains = ["sensor"];
    const maxEntities = 1;
    const foundEntities = findEntities(
      hass,
      lovelaceConfig,
      maxEntities,
      entities,
      entitiesFill,
      includeDomains
    );

    return { entities: foundEntities };
  }

  @property() public hass?: HomeAssistant;
  @property() private _stateHistory?: any;
  @property() private _config?: HistoryGraphCardConfig;
  private _configEntities?: EntityConfig[];
  private _names: { [key: string]: string } = {};
  private _cacheConfig?: CacheConfig;
  private _interval?: number;

  public getCardSize(): number {
    return 4;
  }

  public setConfig(config: HistoryGraphCardConfig): void {
    if (!config.entities) {
      throw new Error("Entities must be defined");
    }

    if (config.entities && !Array.isArray(config.entities)) {
      throw new Error("Entities need to be an array");
    }

    this._config = { theme: "default", ...config };
    this._configEntities = config.entities
      ? processConfigEntities(config.entities)
      : [];

    const _entities: string[] = [];

    this._configEntities.forEach((entity) => {
      _entities.push(entity.entity);
      if (entity.name) {
        this._names[entity.entity] = entity.name;
      }
    });

    this._cacheConfig = {
      cacheKey: _entities.join(),
      hoursToShow: config.hours_to_show || 24,
      refresh: config.refresh_interval || 0,
    };
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._clearInterval();
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (!this._config || !this.hass || !this._cacheConfig) {
      return;
    }

    if (!changedProps.has("_config")) {
      return;
    }

    const oldConfig = changedProps.get("_config") as HistoryGraphCardConfig;

    if (oldConfig !== this._config) {
      this._getStateHistory();
      this._clearInterval();

      if (!this._interval && this._cacheConfig.refresh) {
        this._interval = window.setInterval(() => {
          this._getStateHistory();
        }, this._cacheConfig.refresh * 1000);
      }
    }
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    return html`
      <ha-card .header="${this._config.title}">
        <div
          class="content ${classMap({
            "has-header": !!this._config.title,
          })}"
        >
          <state-history-charts
            .hass=${this.hass}
            .historyData=${this._stateHistory}
            .names=${this._names}
            .upToNow=${true}
            .noSingle=${true}
          ></state-history-charts>
        </div>
      </ha-card>
    `;
  }

  private _getStateHistory(): void {
    getRecentWithCache(
      this.hass!,
      this._cacheConfig!.cacheKey,
      this._cacheConfig!,
      this.hass!.localize,
      this.hass!.language
    ).then((stateHistory) => {
      this._stateHistory = {
        ...this._stateHistory,
        ...stateHistory,
      };
    });
  }

  private _clearInterval(): void {
    if (this._interval) {
      window.clearInterval(this._interval);
      this._interval = undefined;
    }
  }

  static get styles(): CSSResult {
    return css`
      .content {
        padding: 16px;
      }
      .has-header {
        padding-top: 0;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-history-graph-card": HuiHistoryGraphCard;
  }
}
