import { differenceInDays, subHours } from "date-fns";
import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import { theme2hex } from "../../../common/color/convert-color";
import { consume } from "../../../common/decorators/consume";
import {
  consumeEntityStates,
  consumeLocalize,
} from "../../../common/decorators/consume-context-entry";
import { transform } from "../../../common/decorators/transform";
import type { LocalizeFunc } from "../../../common/translations/localize";
import { createSearchParam } from "../../../common/url/search-params";
import "../../../components/ha-card";
import "../../../components/ha-icon-next";
import "../../../components/ha-tooltip";
import { apiContext, formattersContext } from "../../../data/context";
import {
  getSuggestedPeriod,
  validateEnergyCollectionKey,
} from "../../../data/energy";
import { EnergyCollectionController } from "../../../data/energy-collection-controller";
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
import type {
  HomeAssistant,
  HomeAssistantApi,
  HomeAssistantFormatters,
} from "../../../types";
import { findEntities } from "../common/find-entities";
import { processConfigEntities } from "../common/process-config-entities";
import type { LovelaceCard, LovelaceGridOptions } from "../types";
import { getSuggestedMax } from "./energy/common/energy-chart-options";
import type { GraphEntityConfig, StatisticsGraphCardConfig } from "./types";

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

  @state() private _config?: StatisticsGraphCardConfig;

  @state() private _statistics?: Statistics;

  @state() private _metadata?: Record<string, StatisticsMetaData>;

  @state() private _unit?: string;

  private _entities: GraphEntityConfig[] = [];

  @state() private _entityIds: string[] = [];

  private _historyLinkId = `history-${Math.random().toString(36).substring(2, 9)}`;

  private _colors: Record<string, string | undefined> = {};

  private _interval?: number;

  private _statTypes?: StatisticType[];

  @state() private _energyStart?: Date;

  @state() private _energyEnd?: Date;

  @state()
  @consumeEntityStates({ entityIdPath: ["_entityIds"] })
  private _stateObjs?: Record<string, HassEntity>;

  @state()
  @consume({ context: formattersContext, subscribe: true })
  @transform<
    HomeAssistantFormatters,
    HomeAssistantFormatters["formatEntityName"]
  >({
    transformer: ({ formatEntityName }) => formatEntityName,
  })
  private _formatEntityName!: HomeAssistantFormatters["formatEntityName"];

  @state() @consumeLocalize() private _localize!: LocalizeFunc;

  @consume({ context: apiContext, subscribe: true })
  private _api!: HomeAssistantApi;

  constructor() {
    super();
    new EnergyCollectionController(this, {
      config: () =>
        this._config?.energy_date_selection ? this._config : undefined,
      onData: (data) => {
        this._energyStart = data.start;
        this._energyEnd = data.end;
        this._getStatistics();
      },
    });
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
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
      this._fetchInitialStatistics();
    } else if (this._interval === undefined) {
      this._setFetchStatisticsTimer(true);
    }
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

    if (config.energy_date_selection && config.collection_key) {
      validateEnergyCollectionKey(config.collection_key);
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
    this._computeColors();
  }

  private _computeNames = memoizeOne(
    (
      entities: GraphEntityConfig[],
      stateObjs: Record<string, HassEntity> | undefined,
      formatEntityName: HomeAssistantFormatters["formatEntityName"],
      metadata: Record<string, StatisticsMetaData> | undefined
    ) => {
      const names: Record<string, string> = {};
      entities.forEach((config) => {
        const stateObj = stateObjs?.[config.entity];
        if (stateObj) {
          names[config.entity] =
            formatEntityName(stateObj, config.name) || config.entity;
        } else {
          names[config.entity] =
            (typeof config.name === "string" ? config.name : undefined) ||
            metadata?.[config.entity]?.name ||
            config.entity;
        }
      });
      return names;
    }
  );

  private _computeColors() {
    if (!this._config) {
      return;
    }
    this._colors = {};
    this._entities.forEach((entity) => {
      // if color = undefined, it is automatically defined inside a chart component
      this._colors[entity.entity] = entity.color
        ? theme2hex(entity.color)
        : undefined;
    });
  }

  public willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);
    if (!this._config || !changedProps.has("_config")) {
      return;
    }

    const oldConfig = changedProps.get("_config") as
      StatisticsGraphCardConfig | undefined;

    if (
      this._config.energy_date_selection &&
      !oldConfig?.energy_date_selection
    ) {
      this._fetchInitialStatistics();
      return;
    }
    if (
      !this._config.energy_date_selection &&
      oldConfig?.energy_date_selection
    ) {
      this._energyStart = undefined;
      this._energyEnd = undefined;
      this._setFetchStatisticsTimer();
      return;
    }

    if (
      changedProps.has("_config") &&
      oldConfig?.entities !== this._config.entities
    ) {
      if (this._config.energy_date_selection) {
        this._fetchInitialStatistics();
      } else {
        this._setFetchStatisticsTimer(true);
      }
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

  private async _fetchInitialStatistics() {
    await this._getStatisticsMetaData(this._entityIds);
    await this._getStatistics();
  }

  private async _setFetchStatisticsTimer(fetchMetadata = false) {
    clearInterval(this._interval);
    this._interval = 0; // block concurrent calls
    if (fetchMetadata) {
      await this._getStatisticsMetaData(this._entityIds);
    }
    await this._getStatistics();
    if (!this.isConnected) {
      this._interval = undefined;
      return;
    }
    // statistics are created every hour
    if (!this._config?.energy_date_selection) {
      this._interval = window.setInterval(
        () => this._getStatistics(),
        this._intervalTimeout
      );
    }
  }

  private get _period() {
    const period = this._config?.period;
    const autoMode = period === "auto";
    return this._energyStart && this._energyEnd && (!period || autoMode)
      ? getSuggestedPeriod(this._energyStart, this._energyEnd)
      : autoMode
        ? undefined
        : period;
  }

  protected render() {
    if (!this._config) {
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
        ${
          this._config.title
            ? html`
                <h1 class="card-header">
                  ${this._config.title}
                  <a
                    id=${this._historyLinkId}
                    href=${configUrl}
                    aria-label=${this._localize("panel.history")}
                  >
                    <ha-icon-next></ha-icon-next>
                  </a>
                  <ha-tooltip for=${this._historyLinkId} placement="left">
                    ${this._localize("panel.history")}
                  </ha-tooltip>
                </h1>
              `
            : nothing
        }
        <div
          class="content ${classMap({
            "has-header": !!this._config.title,
            "has-rows": !!this._config.grid_options?.rows,
          })}"
        >
          <statistics-chart
            .isLoadingData=${!this._statistics}
            .statisticsData=${this._statistics}
            .metadata=${this._metadata}
            .period=${this._period}
            .chartType=${this._config.chart_type || "line"}
            .statTypes=${this._statTypes!}
            .names=${this._computeNames(
              this._entities,
              this._stateObjs,
              this._formatEntityName,
              this._metadata
            )}
            .unit=${this._unit}
            .minYAxis=${this._config.min_y_axis}
            .maxYAxis=${this._config.max_y_axis}
            .colors=${this._colors}
            .startTime=${this._energyStart}
            .endTime=${
              this._energyEnd && this._energyStart
                ? getSuggestedMax(
                    this._period!,
                    this._energyEnd,
                    (this._config.chart_type ?? "line").startsWith("line")
                  )
                : undefined
            }
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
      this._api.callWS,
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
            getDisplayUnit(
              this._stateObjs ?? {},
              metaData?.statistic_id,
              metaData
            ) === this._config!.unit
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
          ? getDisplayUnit(
              this._stateObjs ?? {},
              metadata.statistic_id,
              metadata
            ) || undefined
          : undefined;
      }
      const unitconfig = unitClass ? { [unitClass]: this._unit } : undefined;
      const statistics = await fetchStatistics(
        this._api.callWS,
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
      --ha-icon-button-size: 24px;
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
