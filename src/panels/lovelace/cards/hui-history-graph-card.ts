import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import { throttle } from "../../../common/util/throttle";
import "../../../components/ha-card";
import "../../../components/state-history-charts";
import { CacheConfig, getRecentWithCache } from "../../../data/cached-history";
import { HistoryResult } from "../../../data/history";
import { HomeAssistant } from "../../../types";
import { findEntities } from "../common/find-entites";
import { hasConfigOrEntitiesChanged } from "../common/has-changed";
import { processConfigEntities } from "../common/process-config-entities";
import { EntityConfig } from "../entity-rows/types";
import { LovelaceCard } from "../types";
import { HistoryGraphCardConfig } from "./types";

@customElement("hui-history-graph-card")
export class HuiHistoryGraphCard extends LitElement implements LovelaceCard {
  public static async getConfigElement() {
    await import("../editor/config-elements/hui-history-graph-card-editor");
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

  @internalProperty() private _stateHistory?: HistoryResult;

  @internalProperty() private _config?: HistoryGraphCardConfig;

  private _configEntities?: EntityConfig[];

  private _names: Record<string, string> = {};

  private _cacheConfig?: CacheConfig;

  private _fetching = false;

  private _throttleGetStateHistory?: () => void;

  public getCardSize(): number {
    return this._config?.title
      ? 2
      : 0 + 2 * (this._configEntities?.length || 1);
  }

  public setConfig(config: HistoryGraphCardConfig): void {
    if (!config.entities.length) {
      throw new Error("Entities must be specified");
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

    this._throttleGetStateHistory = throttle(() => {
      this._getStateHistory();
    }, config.refresh_interval || 10 * 1000);

    this._cacheConfig = {
      cacheKey: _entities.join(),
      hoursToShow: config.hours_to_show || 24,
    };
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return hasConfigOrEntitiesChanged(this, changedProps);
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (
      !this._config ||
      !this.hass ||
      !this._throttleGetStateHistory ||
      !this._cacheConfig
    ) {
      return;
    }

    if (!changedProps.has("_config") && !changedProps.has("hass")) {
      return;
    }

    const oldConfig = changedProps.get("_config") as
      | HistoryGraphCardConfig
      | undefined;

    if (
      changedProps.has("_config") &&
      (oldConfig?.entities !== this._config.entities ||
        oldConfig?.hours_to_show !== this._config.hours_to_show)
    ) {
      this._throttleGetStateHistory();
    } else if (changedProps.has("hass")) {
      // wait for commit of data (we only account for the default setting of 1 sec)
      setTimeout(this._throttleGetStateHistory, 1000);
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
            .isLoadingData=${!this._stateHistory}
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
    if (this._fetching) {
      return;
    }
    this._fetching = true;
    try {
      this._stateHistory = {
        ...(await getRecentWithCache(
          this.hass!,
          this._cacheConfig!.cacheKey,
          this._cacheConfig!,
          this.hass!.localize,
          this.hass!.language
        )),
      };
    } finally {
      this._fetching = false;
    }
  }

  static get styles(): CSSResult {
    return css`
      ha-card {
        height: 100%;
      }
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
