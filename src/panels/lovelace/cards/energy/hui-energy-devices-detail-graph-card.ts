import { endOfToday, startOfToday } from "date-fns";
import type { HassConfig, HassEntities } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import type { BarSeriesOption } from "echarts/charts";
import { consume } from "../../../../common/decorators/consume";
import { transform } from "../../../../common/decorators/transform";
import "../../../../components/ha-card";
import "../../../../components/chart/ha-chart-base";
import {
  configContext,
  formattersContext,
  internationalizationContext,
  statesContext,
  uiContext,
} from "../../../../data/context";
import type { EnergyData } from "../../../../data/energy";
import { validateEnergyCollectionKey } from "../../../../data/energy";
import { EnergyCollectionController } from "../../../../data/energy-collection-controller";
import { isExternalStatistic } from "../../../../data/recorder";
import type { HASSDomEvent } from "../../../../common/dom/fire_event";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { FrontendLocaleData } from "../../../../data/translation";
import type {
  HomeAssistant,
  HomeAssistantConfig,
  HomeAssistantFormatters,
  HomeAssistantInternationalization,
  HomeAssistantUI,
} from "../../../../types";
import type { LovelaceCard } from "../../types";
import type { EnergyDevicesDetailGraphCardConfig } from "../types";
import { getCommonOptions } from "./common/energy-chart-options";
import { storage } from "../../../../common/decorators/storage";
import type { HaECOption } from "../../../../resources/echarts/echarts";
import { formatNumber } from "../../../../common/number/format_number";
import type { CustomLegendOption } from "../../../../components/chart/ha-chart-base";
import {
  generateEnergyDevicesDetailGraphData,
  getStatIdFromId,
  UNIT,
} from "./energy-devices-detail-graph-data";

@customElement("hui-energy-devices-detail-graph-card")
export class HuiEnergyDevicesDetailGraphCard
  extends LitElement
  implements LovelaceCard
{
  public static async getConfigElement() {
    await import("../../editor/config-elements/hui-energy-devices-card-editor");
    return document.createElement("hui-energy-devices-card-editor");
  }

  @state() private _config?: EnergyDevicesDetailGraphCardConfig;

  public static getStubConfig(
    _hass: HomeAssistant,
    _entities: string[],
    _entitiesFill: string[]
  ): EnergyDevicesDetailGraphCardConfig {
    return {
      type: "energy-devices-detail-graph",
    };
  }

  @state() private _chartData: BarSeriesOption[] = [];

  @state() private _yAxisFractionDigits = 1;

  @state() private _data?: EnergyData;

  @state() private _legendData?: CustomLegendOption["data"];

  @state() private _start = startOfToday();

  @state() private _end = endOfToday();

  @state() private _compareStart?: Date;

  @state() private _compareEnd?: Date;

  @state()
  @storage({
    key: "energy-devices-hidden-stats",
    state: true,
    subscribe: false,
  })
  private _hiddenStats: string[] = [];

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: HomeAssistantInternationalization;

  @state()
  @consume({ context: configContext, subscribe: true })
  @transform<HomeAssistantConfig, HassConfig>({
    transformer: ({ config }) => config,
  })
  private _hassConfig!: HassConfig;

  @consume({ context: statesContext, subscribe: true })
  private _states!: HassEntities;

  @consume({ context: formattersContext, subscribe: true })
  private _formatters!: HomeAssistantFormatters;

  @consume({ context: uiContext, subscribe: true })
  private _ui!: HomeAssistantUI;

  constructor() {
    super();
    new EnergyCollectionController(this, {
      config: () => this._config,
      onData: (data) => {
        this._data = data;
      },
    });
  }

  public getCardSize(): Promise<number> | number {
    return 3;
  }

  public setConfig(config: EnergyDevicesDetailGraphCardConfig): void {
    if (config.collection_key) {
      validateEnergyCollectionKey(config.collection_key);
    }
    this._config = config;
  }

  protected willUpdate(changedProps: PropertyValues) {
    if (
      changedProps.has("_config") ||
      changedProps.has("_data") ||
      changedProps.has("_i18n")
    ) {
      this._processStatistics();
    }
  }

  protected render() {
    if (!this._config) {
      return nothing;
    }

    return html`
      <ha-card>
        ${
          this._config.title
            ? html`<h1 class="card-header">${this._config.title}</h1>`
            : ""
        }
        <div
          class="content ${classMap({
            "has-header": !!this._config.title,
          })}"
        >
          <ha-chart-base
            .data=${this._chartData}
            .options=${this._createOptions(
              this._start,
              this._end,
              this._i18n.locale,
              this._hassConfig,
              UNIT,
              this._compareStart,
              this._compareEnd,
              this._yAxisFractionDigits,
              this._legendData
            )}
            .expandLegend=${this._config.expand_legend}
            click-label-for-more-info
            @dataset-hidden=${this._datasetHidden}
            @dataset-unhidden=${this._datasetUnhidden}
            @legend-label-click=${this._handleLegendLabelClick}
          ></ha-chart-base>
        </div>
      </ha-card>
    `;
  }

  private _formatTotal = (total: number) =>
    this._i18n.localize(
      "ui.panel.lovelace.cards.energy.energy_usage_graph.total_consumed",
      { num: formatNumber(total, this._i18n.locale), unit: UNIT }
    );

  // ha-chart-base will track hidden per ID (so it will have two entries for ID and compare-ID)
  // But it will only fire the event for the primary ID, and we will convert and store a list of statistic ids only
  private _datasetHidden(ev) {
    this._hiddenStats = [
      ...this._hiddenStats,
      this._getStatIdFromId(ev.detail.id),
    ];
  }

  private _datasetUnhidden(ev) {
    this._hiddenStats = this._hiddenStats.filter(
      (stat) => stat !== this._getStatIdFromId(ev.detail.id)
    );
  }

  private _handleLegendLabelClick(
    ev: HASSDomEvent<HASSDomEvents["legend-label-click"]>
  ) {
    const entityId = this._getStatIdFromId(ev.detail.id);
    if (isExternalStatistic(entityId)) {
      return;
    }
    if (this._states[entityId]) {
      fireEvent(this, "hass-more-info", { entityId });
    }
  }

  private _createOptions = memoizeOne(
    (
      start: Date,
      end: Date,
      locale: FrontendLocaleData,
      config: HassConfig,
      unit: string | undefined,
      compareStart: Date | undefined,
      compareEnd: Date | undefined,
      yAxisFractionDigits: number,
      legendData: CustomLegendOption["data"]
    ): HaECOption => {
      const commonOptions = getCommonOptions(
        start,
        end,
        locale,
        config,
        unit,
        compareStart,
        compareEnd,
        this._formatTotal,
        false,
        yAxisFractionDigits
      );

      const selected = legendData
        ? legendData
            .filter(
              (d) =>
                d.id && this._hiddenStats.includes(this._getStatIdFromId(d.id))
            )
            .reduce((acc, d) => {
              acc[d.id!] = false;
              return acc;
            }, {})
        : {};

      return {
        ...commonOptions,
        legend: {
          show: true,
          type: "custom",
          data: legendData,
          selected,
        },
        grid: {
          top: 15,
          bottom: 0,
          left: 1,
          right: 1,
          containLabel: true,
        },
      };
    }
  );

  private _processStatistics() {
    if (!this._data) {
      return;
    }
    const energyData = this._data;

    const {
      chartData,
      yAxisFractionDigits,
      legendData,
      start,
      end,
      compareStart,
      compareEnd,
    } = generateEnergyDevicesDetailGraphData({
      localize: this._i18n.localize,
      locale: this._i18n.locale,
      states: this._states,
      formatEntityName: this._formatters.formatEntityName,
      darkMode: this._ui.themes.darkMode,
      energyData,
      config: this._config!,
      computedStyles: getComputedStyle(this),
      now: endOfToday(),
      untrackedOrder: Date.now(),
    });

    this._start = start;
    this._end = end;
    this._compareStart = compareStart;
    this._compareEnd = compareEnd;
    this._legendData = legendData;
    this._yAxisFractionDigits = yAxisFractionDigits;
    this._chartData = chartData;
  }

  private _getStatIdFromId(id: string): string {
    return getStatIdFromId(id);
  }

  static styles = css`
    .card-header {
      padding-bottom: 0;
    }
    .content {
      padding: 16px;
    }
    .has-header {
      padding-top: 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-devices-detail-graph-card": HuiEnergyDevicesDetailGraphCard;
  }
}
