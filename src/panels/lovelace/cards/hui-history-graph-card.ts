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
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import "../../../components/ha-card";
import "../../../components/state-history-charts";
import { CacheConfig, getRecentWithCache } from "../../../data/cached-history";
import { HomeAssistant } from "../../../types";
import { findEntities } from "../common/find-entites";
import { processConfigEntities } from "../common/process-config-entities";
import { EntityConfig } from "../entity-rows/types";
import { LovelaceCard } from "../types";
import { HistoryGraphCardConfig } from "./types";

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
    entities: string[],
    entitiesFallback: string[]
  ): HistoryGraphCardConfig {
    const includeDomains = ["sensor"];
    const maxEntities = 1;
    const foundEntities = findEntities(
      hass,
      maxEntities,
      entities,
      entitiesFallback,
      includeDomains
    );

    return { type: "history-graph", entities: foundEntities };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @internalProperty() private _stateHistory?: any;

  @internalProperty() private _config?: HistoryGraphCardConfig;

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

    this._config = config;
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

  private async _getStateHistory(): Promise<void> {
    this._stateHistory = await getRecentWithCache(
      this.hass!,
      this._cacheConfig!.cacheKey,
      this._cacheConfig!,
      this.hass!.localize,
      this.hass!.language
    );
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
