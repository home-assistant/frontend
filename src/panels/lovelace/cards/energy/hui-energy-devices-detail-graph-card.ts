import {
  ChartData,
  ChartDataset,
  ChartOptions,
  ScatterDataPoint,
} from "chart.js";
import { endOfToday, startOfToday } from "date-fns";
import { HassConfig, UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  PropertyValues,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import { getGraphColorByIndex } from "../../../../common/color/colors";
import { getEnergyColor } from "./common/color";
import { ChartDatasetExtra } from "../../../../components/chart/ha-chart-base";
import "../../../../components/ha-card";
import {
  DeviceConsumptionEnergyPreference,
  EnergyData,
  getEnergyDataCollection,
  getSummedData,
  computeConsumptionData,
} from "../../../../data/energy";
import {
  calculateStatisticSumGrowth,
  getStatisticLabel,
  Statistics,
  StatisticsMetaData,
  isExternalStatistic,
} from "../../../../data/recorder";
import { FrontendLocaleData } from "../../../../data/translation";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import { HomeAssistant } from "../../../../types";
import { LovelaceCard } from "../../types";
import { EnergyDevicesDetailGraphCardConfig } from "../types";
import { hasConfigChanged } from "../../common/has-changed";
import { getCommonOptions } from "./common/energy-chart-options";
import { fireEvent } from "../../../../common/dom/fire_event";
import { storage } from "../../../../common/decorators/storage";
import { clickIsTouch } from "../../../../components/chart/click_is_touch";

const UNIT = "kWh";

@customElement("hui-energy-devices-detail-graph-card")
export class HuiEnergyDevicesDetailGraphCard
  extends SubscribeMixin(LitElement)
  implements LovelaceCard
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: EnergyDevicesDetailGraphCardConfig;

  @state() private _chartData: ChartData = { datasets: [] };

  @state() private _chartDatasetExtra: ChartDatasetExtra[] = [];

  @state() private _data?: EnergyData;

  @state() private _start = startOfToday();

  @state() private _end = endOfToday();

  @state() private _compareStart?: Date;

  @state() private _compareEnd?: Date;

  @storage({
    key: "energy-devices-hidden-stats",
    state: true,
    subscribe: false,
  })
  private _hiddenStats: string[] = [];

  private _untrackedIndex?: number;

  protected hassSubscribeRequiredHostProps = ["_config"];

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      getEnergyDataCollection(this.hass, {
        key: this._config?.collection_key,
      }).subscribe((data) => {
        this._data = data;
        this._processStatistics();
      }),
    ];
  }

  public getCardSize(): Promise<number> | number {
    return 3;
  }

  public setConfig(config: EnergyDevicesDetailGraphCardConfig): void {
    this._config = config;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return (
      hasConfigChanged(this, changedProps) ||
      changedProps.size > 1 ||
      !changedProps.has("hass")
    );
  }

  protected willUpdate(changedProps: PropertyValues) {
    if (
      (changedProps.has("_hiddenStats") || changedProps.has("_config")) &&
      this._data
    ) {
      this._processStatistics();
    }
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    return html`
      <ha-card>
        ${this._config.title
          ? html`<h1 class="card-header">${this._config.title}</h1>`
          : ""}
        <div
          class="content ${classMap({
            "has-header": !!this._config.title,
          })}"
        >
          <ha-chart-base
            externalHidden
            .hass=${this.hass}
            .data=${this._chartData}
            .extraData=${this._chartDatasetExtra}
            .options=${this._createOptions(
              this._start,
              this._end,
              this.hass.locale,
              this.hass.config,
              UNIT,
              this._compareStart,
              this._compareEnd
            )}
            chart-type="bar"
            @dataset-hidden=${this._datasetHidden}
            @dataset-unhidden=${this._datasetUnhidden}
          ></ha-chart-base>
        </div>
      </ha-card>
    `;
  }

  private _datasetHidden(ev) {
    const hiddenEntity =
      ev.detail.index === this._untrackedIndex
        ? "untracked"
        : this._data!.prefs.device_consumption[ev.detail.index]
            .stat_consumption;
    this._hiddenStats = [...this._hiddenStats, hiddenEntity];
  }

  private _datasetUnhidden(ev) {
    const hiddenEntity =
      ev.detail.index === this._untrackedIndex
        ? "untracked"
        : this._data!.prefs.device_consumption[ev.detail.index]
            .stat_consumption;
    this._hiddenStats = this._hiddenStats.filter(
      (stat) => stat !== hiddenEntity
    );
  }

  private _createOptions = memoizeOne(
    (
      start: Date,
      end: Date,
      locale: FrontendLocaleData,
      config: HassConfig,
      unit?: string,
      compareStart?: Date,
      compareEnd?: Date
    ): ChartOptions => {
      const commonOptions = getCommonOptions(
        start,
        end,
        locale,
        config,
        unit,
        compareStart,
        compareEnd
      );

      const options: ChartOptions = {
        ...commonOptions,
        interaction: {
          mode: "nearest",
        },
        plugins: {
          ...commonOptions.plugins!,
          legend: {
            display: true,
            labels: {
              usePointStyle: true,
            },
          },
        },
        onClick: (event, elements, chart) => {
          if (clickIsTouch(event)) return;

          const index = elements[0]?.datasetIndex ?? -1;
          if (index < 0) return;

          const statisticId =
            this._data?.prefs.device_consumption[index]?.stat_consumption;

          if (!statisticId || isExternalStatistic(statisticId)) return;

          fireEvent(this, "hass-more-info", { entityId: statisticId });
          chart?.canvas?.dispatchEvent(new Event("mouseout")); // to hide tooltip
        },
      };
      return options;
    }
  );

  private _processStatistics() {
    const energyData = this._data!;
    const data = energyData.stats;
    const compareData = energyData.statsCompare;

    const computedStyle = getComputedStyle(this);

    const growthValues = {};
    energyData.prefs.device_consumption.forEach((device) => {
      const value =
        device.stat_consumption in data
          ? calculateStatisticSumGrowth(data[device.stat_consumption]) || 0
          : 0;

      growthValues[device.stat_consumption] = value;
    });

    const sorted_devices = energyData.prefs.device_consumption.map(
      (device) => device.stat_consumption
    );
    sorted_devices.sort((a, b) => growthValues[b] - growthValues[a]);

    const datasets: ChartDataset<"bar", ScatterDataPoint[]>[] = [];
    const datasetExtras: ChartDatasetExtra[] = [];

    const { data: processedData, dataExtras: processedDataExtras } =
      this._processDataSet(
        computedStyle,
        data,
        energyData.statsMetadata,
        energyData.prefs.device_consumption,
        sorted_devices
      );

    datasets.push(...processedData);

    datasetExtras.push(...processedDataExtras);

    const { summedData, compareSummedData } = getSummedData(energyData);

    const showUntracked =
      "from_grid" in summedData ||
      "solar" in summedData ||
      "from_battery" in summedData;

    const {
      consumption: consumptionData,
      compareConsumption: consumptionCompareData,
    } = showUntracked
      ? computeConsumptionData(summedData, compareSummedData)
      : { consumption: undefined, compareConsumption: undefined };

    if (showUntracked) {
      this._untrackedIndex = datasets.length;
      const { dataset: untrackedData, datasetExtra: untrackedDataExtra } =
        this._processUntracked(
          computedStyle,
          processedData,
          consumptionData,
          false
        );
      datasets.push(untrackedData);
      datasetExtras.push(untrackedDataExtra);
    }

    if (compareData) {
      // Add empty dataset to align the bars
      datasets.push({
        order: 0,
        data: [],
      });
      datasetExtras.push({
        show_legend: false,
      });
      datasets.push({
        order: 999,
        data: [],
        xAxisID: "xAxisCompare",
      });
      datasetExtras.push({
        show_legend: false,
      });

      const {
        data: processedCompareData,
        dataExtras: processedCompareDataExtras,
      } = this._processDataSet(
        computedStyle,
        compareData,
        energyData.statsMetadata,
        energyData.prefs.device_consumption,
        sorted_devices,
        true
      );

      datasets.push(...processedCompareData);
      datasetExtras.push(...processedCompareDataExtras);

      if (showUntracked) {
        const {
          dataset: untrackedCompareData,
          datasetExtra: untrackedCompareDataExtra,
        } = this._processUntracked(
          computedStyle,
          processedCompareData,
          consumptionCompareData,
          true
        );
        datasets.push(untrackedCompareData);
        datasetExtras.push(untrackedCompareDataExtra);
      }
    }

    this._start = energyData.start;
    this._end = energyData.end || endOfToday();

    this._compareStart = energyData.startCompare;
    this._compareEnd = energyData.endCompare;

    this._chartData = {
      datasets,
    };
    this._chartDatasetExtra = datasetExtras;
  }

  private _processUntracked(
    computedStyle: CSSStyleDeclaration,
    processedData,
    consumptionData,
    compare: boolean
  ): { dataset; datasetExtra } {
    const totalDeviceConsumption: { [start: number]: number } = {};

    processedData.forEach((device) => {
      device.data.forEach((datapoint) => {
        totalDeviceConsumption[datapoint.x] =
          (totalDeviceConsumption[datapoint.x] || 0) + datapoint.y;
      });
    });

    const untrackedConsumption: { x: number; y: number }[] = [];
    Object.keys(consumptionData.total).forEach((time) => {
      untrackedConsumption.push({
        x: Number(time),
        y: consumptionData.total[time] - (totalDeviceConsumption[time] || 0),
      });
    });
    const dataset = {
      label: this.hass.localize(
        "ui.panel.lovelace.cards.energy.energy_devices_detail_graph.untracked_consumption"
      ),
      hidden: this._hiddenStats.includes("untracked"),
      borderColor: getEnergyColor(
        computedStyle,
        this.hass.themes.darkMode,
        false,
        compare,
        "--state-unavailable-color"
      ),
      backgroundColor: getEnergyColor(
        computedStyle,
        this.hass.themes.darkMode,
        true,
        compare,
        "--state-unavailable-color"
      ),
      data: untrackedConsumption,
      order: 1 + this._untrackedIndex!,
      stack: "devices",
      pointStyle: compare ? false : "circle",
      xAxisID: compare ? "xAxisCompare" : undefined,
    };
    const datasetExtra = {
      show_legend: !compare,
    };
    return { dataset, datasetExtra };
  }

  private _processDataSet(
    computedStyle: CSSStyleDeclaration,
    statistics: Statistics,
    statisticsMetaData: Record<string, StatisticsMetaData>,
    devices: DeviceConsumptionEnergyPreference[],
    sorted_devices: string[],
    compare = false
  ) {
    const data: ChartDataset<"bar", ScatterDataPoint[]>[] = [];
    const dataExtras: ChartDatasetExtra[] = [];

    devices.forEach((source, idx) => {
      const color = getGraphColorByIndex(idx, computedStyle);

      let prevStart: number | null = null;

      const consumptionData: ScatterDataPoint[] = [];

      // Process gas consumption data.
      if (source.stat_consumption in statistics) {
        const stats = statistics[source.stat_consumption];
        let end;

        for (const point of stats) {
          if (point.change === null || point.change === undefined) {
            continue;
          }
          if (prevStart === point.start) {
            continue;
          }
          const date = new Date(point.start);
          consumptionData.push({
            x: date.getTime(),
            y: point.change,
          });
          prevStart = point.start;
          end = point.end;
        }
        if (consumptionData.length === 1) {
          consumptionData.push({
            x: end,
            y: 0,
          });
        }
      }

      const order = sorted_devices.indexOf(source.stat_consumption);
      const itemExceedsMax = !!(
        this._config?.max_devices && order >= this._config.max_devices
      );

      data.push({
        label:
          source.name ||
          getStatisticLabel(
            this.hass,
            source.stat_consumption,
            statisticsMetaData[source.stat_consumption]
          ),
        hidden:
          this._hiddenStats.includes(source.stat_consumption) || itemExceedsMax,
        borderColor: compare ? color + "7F" : color,
        backgroundColor: compare ? color + "32" : color + "7F",
        data: consumptionData,
        order: 1 + order,
        stack: "devices",
        pointStyle: compare ? false : "circle",
        xAxisID: compare ? "xAxisCompare" : undefined,
      });
      dataExtras.push({ show_legend: !compare && !itemExceedsMax });
    });
    return { data, dataExtras };
  }

  static get styles(): CSSResultGroup {
    return css`
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
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-devices-detail-graph-card": HuiEnergyDevicesDetailGraphCard;
  }
}
