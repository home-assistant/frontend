import { differenceInDays, subHours } from "date-fns";
import type { HassEntity, UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { createSearchParam } from "../../../common/url/search-params";
import "../../../components/ha-card";
import "../../../components/ha-icon-next";
import "../../../components/ha-tooltip";
import {
  getEnergyDataCollection,
  getSuggestedPeriod,
} from "../../../data/energy";
import type {
  Statistics,
  StatisticsMetaData,
  StatisticType,
} from "../../../data/recorder";
import {
  fetchStatistics,
  getDisplayUnit,
  getStatisticMetadata,
} from "../../../data/recorder";
import type { HomeAssistant } from "../../../types";
import { computeLovelaceEntityName } from "../common/entity/compute-lovelace-entity-name";
import { findEntities } from "../common/find-entities";
import { hasConfigOrEntitiesChanged } from "../common/has-changed";
import { processConfigEntities } from "../common/process-config-entities";
import type { EntityConfig } from "../entity-rows/types";
import type { LovelaceCard, LovelaceGridOptions } from "../types";
import { getSuggestedMax } from "./energy/common/energy-chart-options";
import type { StatisticsGraphCardConfig } from "./types";

export const DEFAULT_DAYS_TO_SHOW = 30;

@customElement("hui-statistics-graph-card")
export class HuiStatisticsGraphCard extends LitElement implements LovelaceCard {
  public static async getConfigElement() {
    await import("../editor/config-elements/hui-statistics-graph-card-editor");
    return document.createElement("hui-statistics-graph-card-editor");
  }

  public static getStubConfig(
    hass: HomeAssistant,
    entities: string[],
    entitiesFill: string[]
  ): StatisticsGraphCardConfig {
    const includeDomains = ["sensor"];
    const maxEntities = 1;
    const foundEntities = findEntities(
      hass,
      maxEntities,
      entities,
      entitiesFill,
      includeDomains,
      (stateObj: HassEntity) => "state_class" in stateObj.attributes
    );
    return {
      type: "statistics-graph",
      entities: foundEntities.length ? [foundEntities[0]] : [],
    };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: StatisticsGraphCardConfig;

  @state() private _statistics?: Statistics;

  @state() private _metadata?: Record<string, StatisticsMetaData>;

  @state() private _unit?: string;

  private _entities: EntityConfig[] = [];

  private _entityIds: string[] = [];

  private _historyLinkId = `history-${Math.random().toString(36).substring(2, 9)}`;

  private _names: Record<string, string> = {};

  private _interval?: number;

  private _statTypes?: StatisticType[];

  private _energySub?: UnsubscribeFunc;

  @state() private _energyStart?: Date;

  @state() private _energyEnd?: Date;

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribeEnergy();
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = undefined;
    }
  }

  public connectedCallback() {
    super.connectedCallback();
    if (!this.hasUpdated) {
      return;
    }
    if (this._config?.energy_date_selection) {
      this._subscribeEnergy();
    } else if (this._interval === undefined) {
      this._setFetchStatisticsTimer(true);
    }
  }

  private _subscribeEnergy() {
    if (!this._energySub) {
      this._energySub = getEnergyDataCollection(this.hass!, {
        key: this._config?.collection_key,
      }).subscribe((data) => {
        this._energyStart = data.start;
        this._energyEnd = data.end;
        this._getStatistics();
      });
    }
  }

  private _unsubscribeEnergy() {
    if (this._energySub) {
      this._energySub();
      this._energySub = undefined;
    }
    this._energyStart = undefined;
    this._energyEnd = undefined;
  }

  public getCardSize(): number {
    return (
      5 +
      (this._config?.title ? 2 : 0) +
      (!this._config?.hide_legend ? this._entities?.length || 0 : 0)
    );
  }

  getGridOptions(): LovelaceGridOptions {
    return {
      columns: 12,
      min_columns: 6,
      min_rows: 3,
    };
  }

  public setConfig(config: StatisticsGraphCardConfig): void {
    if (!config.entities || !Array.isArray(config.entities)) {
      throw new Error("Entities need to be an array");
    }

    if (!config.entities.length) {
      throw new Error("You must include at least one entity");
    }

    this._entities = config.entities
      ? processConfigEntities(config.entities, false)
      : [];
    this._entityIds = this._entities.map((ent) => ent.entity);

    if (typeof config.stat_types === "string") {
      this._statTypes = [config.stat_types];
    } else if (!config.stat_types) {
      this._statTypes = ["change", "state", "sum", "min", "max", "mean"];
    } else {
      this._statTypes = config.stat_types;
    }
    this._config = config;
    this._computeNames();
  }

  private _computeNames() {
    if (!this.hass || !this._config) {
      return;
    }
    this._names = {};
    this._entities.forEach((config) => {
      const stateObj = this.hass!.states[config.entity];
      this._names[config.entity] =
        computeLovelaceEntityName(this.hass!, stateObj, config.name) ||
        config.entity;
    });
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return (
      hasConfigOrEntitiesChanged(this, changedProps) ||
      changedProps.size > 1 ||
      !changedProps.has("hass")
    );
  }

  public willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);
    if (changedProps.has("hass") || changedProps.has("_config")) {
      this._computeNames();
    }

    if (!this._config || !changedProps.has("_config")) {
      return;
    }

    const oldConfig = changedProps.get("_config") as
      | StatisticsGraphCardConfig
      | undefined;

    if (this.hass) {
      if (this._config.energy_date_selection && !this._energySub) {
        this._subscribeEnergy();
        return;
      }
      if (!this._config.energy_date_selection && this._energySub) {
        this._unsubscribeEnergy();
        this._setFetchStatisticsTimer();
        return;
      }
      if (
        this._config.energy_date_selection &&
        this._energySub &&
        changedProps.has("_config") &&
        oldConfig?.collection_key !== this._config.collection_key
      ) {
        this._unsubscribeEnergy();
        this._subscribeEnergy();
      }
    }

    if (
      changedProps.has("_config") &&
      oldConfig?.entities !== this._config.entities
    ) {
      this._setFetchStatisticsTimer(true);
      return;
    }

    if (
      changedProps.has("_config") &&
      (oldConfig?.stat_types !== this._config.stat_types ||
        oldConfig?.days_to_show !== this._config.days_to_show ||
        oldConfig?.period !== this._config.period ||
        oldConfig?.unit !== this._config.unit)
    ) {
      this._setFetchStatisticsTimer();
    }
  }

  private async _setFetchStatisticsTimer(fetchMetadata = false) {
    clearInterval(this._interval);
    this._interval = 0; // block concurrent calls
    if (fetchMetadata) {
      await this._getStatisticsMetaData(this._entityIds);
    }
    await this._getStatistics();
    // statistics are created every hour
    if (!this._config?.energy_date_selection) {
      this._interval = window.setInterval(
        () => this._getStatistics(),
        this._intervalTimeout
      );
    }
  }

  private get _period() {
    return (
      this._config?.period ??
      (this._energyStart && this._energyEnd
        ? getSuggestedPeriod(this._energyStart, this._energyEnd)
        : undefined)
    );
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const hasFixedHeight = typeof this._config.grid_options?.rows === "number";

    const daysToShow =
      this._energyStart && this._energyEnd
        ? differenceInDays(this._energyEnd, this._energyStart)
        : this._config.days_to_show || DEFAULT_DAYS_TO_SHOW;

    const start =
      this._energyStart || subHours(new Date(), 24 * daysToShow + 1);

    const configUrl = `/history?${createSearchParam({
      entity_id: this._entityIds.join(","),
      start_date: start.toISOString(),
    })}`;

    return html`
      <ha-card>
        ${this._config.title
          ? html`
              <h1 class="card-header">
                ${this._config.title}
                <a
                  id=${this._historyLinkId}
                  href=${configUrl}
                  aria-label=${this.hass.localize("panel.history")}
                >
                  <ha-icon-next></ha-icon-next>
                </a>
                <ha-tooltip for=${this._historyLinkId} placement="left">
                  ${this.hass.localize("panel.history")}
                </ha-tooltip>
              </h1>
            `
          : nothing}
        <div
          class="content ${classMap({
            "has-header": !!this._config.title,
            "has-rows": !!this._config.grid_options?.rows,
          })}"
        >
          <statistics-chart
            .hass=${this.hass}
            .isLoadingData=${!this._statistics}
            .statisticsData=${this._statistics}
            .metadata=${this._metadata}
            .period=${this._period}
            .chartType=${this._config.chart_type || "line"}
            .statTypes=${this._statTypes!}
            .names=${this._names}
            .unit=${this._unit}
            .minYAxis=${this._config.min_y_axis}
            .maxYAxis=${this._config.max_y_axis}
            .startTime=${this._energyStart}
            .endTime=${this._energyEnd && this._energyStart
              ? getSuggestedMax(
                  this._period!,
                  this._energyEnd,
                  (this._config.chart_type ?? "line") === "line"
                )
              : undefined}
            .fitYData=${this._config.fit_y_data || false}
            .hideLegend=${this._config.hide_legend || false}
            .logarithmicScale=${this._config.logarithmic_scale || false}
            .daysToShow=${daysToShow}
            .height=${hasFixedHeight ? "100%" : undefined}
            .expandLegend=${this._config.expand_legend}
          ></statistics-chart>
        </div>
      </ha-card>
    `;
  }

  private get _intervalTimeout(): number {
    return (this._config?.period === "5minute" ? 5 : 60) * 1000 * 60;
  }

  private async _getStatisticsMetaData(statisticIds: string[] | undefined) {
    const statsMetadataArray = await getStatisticMetadata(
      this.hass!,
      statisticIds
    );
    const statisticsMetaData = {};
    statsMetadataArray.forEach((x) => {
      statisticsMetaData[x.statistic_id] = x;
    });
    this._metadata = statisticsMetaData;
  }

  private async _getStatistics(): Promise<void> {
    const startDate =
      this._energyStart ??
      subHours(
        new Date(),
        24 * (this._config!.days_to_show || DEFAULT_DAYS_TO_SHOW) + 1
      );
    const endDate = this._energyEnd;
    try {
      let unitClass: string | undefined | null;
      if (this._config!.unit && this._metadata) {
        const metadata = Object.values(this._metadata).find(
          (metaData) =>
            getDisplayUnit(this.hass!, metaData?.statistic_id, metaData) ===
            this._config!.unit
        );
        if (metadata) {
          unitClass = metadata.unit_class;
          this._unit = this._config!.unit;
        }
      }
      if (!unitClass && this._metadata) {
        const metadata = this._metadata[this._entityIds[0]];
        unitClass = metadata?.unit_class;
        this._unit = unitClass
          ? getDisplayUnit(this.hass!, metadata.statistic_id, metadata) ||
            undefined
          : undefined;
      }
      const unitconfig = unitClass ? { [unitClass]: this._unit } : undefined;
      const statistics = await fetchStatistics(
        this.hass!,
        startDate,
        endDate,
        this._entityIds,
        this._period,
        unitconfig,
        this._statTypes
      );

      this._statistics = {};
      this._entities.forEach((entity) => {
        const id = entity.entity;
        if (id in statistics) {
          this._statistics![id] = statistics[id];
        }
      });
    } catch (_err) {
      this._statistics = undefined;
    }
  }

  static styles = css`
    ha-card {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .card-header {
      justify-content: space-between;
      display: flex;
      padding-bottom: 0;
    }
    .card-header ha-icon-next {
      --mdc-icon-button-size: 24px;
      line-height: 24px;
      color: var(--primary-text-color);
    }
    .content {
      padding: 16px;
      flex: 1;
    }
    .has-header {
      padding-top: 0;
    }
    statistics-chart {
      height: 100%;
    }
    .has-rows {
      --chart-max-height: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-statistics-graph-card": HuiStatisticsGraphCard;
  }
}
