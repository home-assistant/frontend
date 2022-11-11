import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import "../../../components/chart/statistics-chart";
import "../../../components/ha-card";
import {
  fetchStatistics,
  getDisplayUnit,
  getStatisticMetadata,
  Statistics,
  StatisticsMetaData,
} from "../../../data/recorder";
import { HomeAssistant } from "../../../types";
import { hasConfigOrEntitiesChanged } from "../common/has-changed";
import { processConfigEntities } from "../common/process-config-entities";
import { LovelaceCard } from "../types";
import { StatisticsGraphCardConfig } from "./types";

@customElement("hui-statistics-graph-card")
export class HuiStatisticsGraphCard extends LitElement implements LovelaceCard {
  public static async getConfigElement() {
    await import("../editor/config-elements/hui-statistics-graph-card-editor");
    return document.createElement("hui-statistics-graph-card-editor");
  }

  public static getStubConfig(): StatisticsGraphCardConfig {
    return { type: "statistics-graph", entities: [] };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: StatisticsGraphCardConfig;

  @state() private _statistics?: Statistics;

  @state() private _metadata?: Record<string, StatisticsMetaData>;

  @state() private _unit?: string;

  private _entities: string[] = [];

  private _names: Record<string, string> = {};

  private _interval?: number;

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
    this._getStatistics();
    // statistics are created every hour
    clearInterval(this._interval);
    this._interval = window.setInterval(
      () => this._getStatistics(),
      this._intervalTimeout
    );
  }

  public getCardSize(): number {
    return this._config?.title ? 2 : 0 + 2 * (this._entities?.length || 1);
  }

  public setConfig(config: StatisticsGraphCardConfig): void {
    if (!config.entities || !Array.isArray(config.entities)) {
      throw new Error("Entities need to be an array");
    }

    if (!config.entities.length) {
      throw new Error("You must include at least one entity");
    }

    const configEntities = config.entities
      ? processConfigEntities(config.entities, false)
      : [];

    this._entities = [];
    configEntities.forEach((entity) => {
      this._entities.push(entity.entity);
      if (entity.name) {
        this._names[entity.entity] = entity.name;
      }
    });

    if (typeof config.stat_types === "string") {
      this._config = { ...config, stat_types: [config.stat_types] };
    } else if (!config.stat_types) {
      this._config = {
        ...config,
        stat_types: ["state", "sum", "min", "max", "mean"],
      };
    } else {
      this._config = config;
    }
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (changedProps.has("_statistics")) {
      return true;
    }
    return hasConfigOrEntitiesChanged(this, changedProps);
  }

  public willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);
    if (
      !this._config ||
      (!changedProps.has("_config") && !changedProps.has("_metadata"))
    ) {
      return;
    }

    const oldConfig = changedProps.get("_config") as
      | StatisticsGraphCardConfig
      | undefined;

    if (
      changedProps.has("_config") &&
      oldConfig?.entities !== this._config.entities
    ) {
      this._getStatisticsMetaData(this._entities);
    }

    if (
      changedProps.has("_metadata") ||
      (changedProps.has("_config") &&
        (oldConfig?.entities !== this._config.entities ||
          oldConfig?.days_to_show !== this._config.days_to_show ||
          oldConfig?.period !== this._config.period ||
          oldConfig?.unit !== this._config.unit))
    ) {
      this._getStatistics();
      // statistics are created every hour
      clearInterval(this._interval);
      this._interval = window.setInterval(
        () => this._getStatistics(),
        this._intervalTimeout
      );
    }
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    return html`
      <ha-card .header=${this._config.title}>
        <div
          class="content ${classMap({
            "has-header": !!this._config.title,
          })}"
        >
          <statistics-chart
            .hass=${this.hass}
            .isLoadingData=${!this._statistics}
            .statisticsData=${this._statistics}
            .metadata=${this._metadata}
            .chartType=${this._config.chart_type || "line"}
            .statTypes=${this._config.stat_types!}
            .names=${this._names}
            .unit=${this._unit}
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
    const startDate = new Date();
    startDate.setTime(
      startDate.getTime() -
        1000 * 60 * 60 * (24 * (this._config!.days_to_show || 30) + 1)
    );
    try {
      let unitClass;
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
        const metadata = this._metadata[this._entities[0]];
        unitClass = metadata?.unit_class;
        this._unit = unitClass
          ? getDisplayUnit(this.hass!, metadata.statistic_id, metadata) ||
            undefined
          : undefined;
      }
      const unitconfig = unitClass ? { [unitClass]: this._unit } : undefined;
      this._statistics = await fetchStatistics(
        this.hass!,
        startDate,
        undefined,
        this._entities,
        this._config!.period,
        unitconfig
      );
    } catch (err) {
      this._statistics = undefined;
    }
  }

  static get styles(): CSSResultGroup {
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
    "hui-statistics-graph-card": HuiStatisticsGraphCard;
  }
}
