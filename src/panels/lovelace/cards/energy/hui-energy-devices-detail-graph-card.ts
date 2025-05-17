import { endOfToday, startOfToday } from "date-fns";
import type { HassConfig, UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import type { BarSeriesOption } from "echarts/charts";
import { getGraphColorByIndex } from "../../../../common/color/colors";
import { getEnergyColor } from "./common/color";
import "../../../../components/ha-card";
import "../../../../components/chart/ha-chart-base";
import type {
  DeviceConsumptionEnergyPreference,
  EnergyData,
} from "../../../../data/energy";
import {
  getEnergyDataCollection,
  getSummedData,
  computeConsumptionData,
} from "../../../../data/energy";
import type { Statistics, StatisticsMetaData } from "../../../../data/recorder";
import {
  calculateStatisticSumGrowth,
  getStatisticLabel,
} from "../../../../data/recorder";
import type { FrontendLocaleData } from "../../../../data/translation";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceCard } from "../../types";
import type { EnergyDevicesDetailGraphCardConfig } from "../types";
import { hasConfigChanged } from "../../common/has-changed";
import {
  fillDataGapsAndRoundCaps,
  getCommonOptions,
  getCompareTransform,
} from "./common/energy-chart-options";
import { storage } from "../../../../common/decorators/storage";
import type { ECOption } from "../../../../resources/echarts";
import { formatNumber } from "../../../../common/number/format_number";

const UNIT = "kWh";

@customElement("hui-energy-devices-detail-graph-card")
export class HuiEnergyDevicesDetailGraphCard
  extends SubscribeMixin(LitElement)
  implements LovelaceCard
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: EnergyDevicesDetailGraphCardConfig;

  @state() private _chartData: BarSeriesOption[] = [];

  @state() private _data?: EnergyData;

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
            .hass=${this.hass}
            .data=${this._chartData}
            .options=${this._createOptions(
              this._start,
              this._end,
              this.hass.locale,
              this.hass.config,
              UNIT,
              this._compareStart,
              this._compareEnd
            )}
            @dataset-hidden=${this._datasetHidden}
            @dataset-unhidden=${this._datasetUnhidden}
          ></ha-chart-base>
        </div>
      </ha-card>
    `;
  }

  private _formatTotal = (total: number) =>
    this.hass.localize(
      "ui.panel.lovelace.cards.energy.energy_usage_graph.total_consumed",
      { num: formatNumber(total, this.hass.locale), unit: UNIT }
    );

  private _datasetHidden(ev) {
    this._hiddenStats = [...this._hiddenStats, ev.detail.name];
  }

  private _datasetUnhidden(ev) {
    this._hiddenStats = this._hiddenStats.filter(
      (stat) => stat !== ev.detail.name
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
    ): ECOption => {
      const commonOptions = getCommonOptions(
        start,
        end,
        locale,
        config,
        unit,
        compareStart,
        compareEnd,
        this._formatTotal
      );

      return {
        ...commonOptions,
        legend: {
          show: true,
          type: "custom",
          selected: this._hiddenStats.reduce((acc, stat) => {
            acc[stat] = false;
            return acc;
          }, {}),
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
    const energyData = this._data!;

    this._start = energyData.start;
    this._end = energyData.end || endOfToday();

    this._compareStart = energyData.startCompare;
    this._compareEnd = energyData.endCompare;

    const data = energyData.stats;
    const compareData = energyData.statsCompare;

    const computedStyle = getComputedStyle(this);

    const devices = energyData.prefs.device_consumption;

    const childMap: Record<string, string[]> = {};
    devices.forEach((d) => {
      if (d.included_in_stat) {
        childMap[d.included_in_stat] = childMap[d.included_in_stat] || [];
        childMap[d.included_in_stat].push(d.stat_consumption);
      }
    });

    const growthValues = {};
    energyData.prefs.device_consumption.forEach((device) => {
      const value =
        device.stat_consumption in data
          ? calculateStatisticSumGrowth(data[device.stat_consumption]) || 0
          : 0;

      growthValues[device.stat_consumption] = value;
    });
    const growthValuesExChildren = {};
    energyData.prefs.device_consumption.forEach((device) => {
      growthValuesExChildren[device.stat_consumption] = (
        childMap[device.stat_consumption] || []
      ).reduce(
        (acc, child) => acc - growthValues[child],
        growthValues[device.stat_consumption]
      );
    });

    const sorted_devices = energyData.prefs.device_consumption.map(
      (device) => device.stat_consumption
    );
    sorted_devices.sort(
      (a, b) => growthValuesExChildren[b] - growthValuesExChildren[a]
    );

    const datasets: BarSeriesOption[] = [];

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

    if (compareData) {
      const processedCompareData = this._processDataSet(
        computedStyle,
        compareData,
        energyData.statsMetadata,
        energyData.prefs.device_consumption,
        sorted_devices,
        childMap,
        true
      );

      datasets.push(...processedCompareData);

      if (showUntracked) {
        const untrackedCompareData = this._processUntracked(
          computedStyle,
          processedCompareData,
          consumptionCompareData,
          true
        );
        datasets.push(untrackedCompareData);
      }
    }

    // add empty dataset so compare bars are first
    // `stack: devices` so it doesn't take up space yet
    datasets.push({
      id: "compare-placeholder",
      type: "bar",
      stack: energyData.statsCompare ? "devicesCompare" : "devices",
      data: [],
    });

    const processedData = this._processDataSet(
      computedStyle,
      data,
      energyData.statsMetadata,
      energyData.prefs.device_consumption,
      sorted_devices,
      childMap
    );

    datasets.push(...processedData);

    if (showUntracked) {
      const untrackedData = this._processUntracked(
        computedStyle,
        processedData,
        consumptionData,
        false
      );
      datasets.push(untrackedData);
    }

    fillDataGapsAndRoundCaps(datasets);
    this._chartData = datasets;
  }

  private _processUntracked(
    computedStyle: CSSStyleDeclaration,
    processedData,
    consumptionData,
    compare: boolean
  ): BarSeriesOption {
    const totalDeviceConsumption: Record<number, number> = {};

    processedData.forEach((device) => {
      device.data.forEach((datapoint) => {
        totalDeviceConsumption[datapoint[compare ? 2 : 0]] =
          (totalDeviceConsumption[datapoint[compare ? 2 : 0]] || 0) +
          datapoint[1];
      });
    });
    const compareTransform = getCompareTransform(
      this._start,
      this._compareStart!
    );

    const untrackedConsumption: BarSeriesOption["data"] = [];
    Object.keys(consumptionData.used_total)
      .sort((a, b) => Number(a) - Number(b))
      .forEach((time) => {
        const ts = Number(time);
        const value =
          consumptionData.used_total[time] -
          (totalDeviceConsumption[time] || 0);
        const dataPoint: number[] = [ts, value];
        if (compare) {
          dataPoint[2] = dataPoint[0];
          dataPoint[0] = compareTransform(new Date(ts)).getTime();
        }
        untrackedConsumption.push(dataPoint);
      });
    // random id to always add untracked at the end
    const order = Date.now();
    const dataset: BarSeriesOption = {
      type: "bar",
      cursor: "default",
      id: compare ? `compare-untracked-${order}` : `untracked-${order}`,
      name: this.hass.localize(
        "ui.panel.lovelace.cards.energy.energy_devices_detail_graph.untracked_consumption"
      ),
      itemStyle: {
        borderColor: getEnergyColor(
          computedStyle,
          this.hass.themes.darkMode,
          false,
          compare,
          "--state-unavailable-color"
        ),
      },
      barMaxWidth: 50,
      color: getEnergyColor(
        computedStyle,
        this.hass.themes.darkMode,
        true,
        compare,
        "--state-unavailable-color"
      ),
      data: untrackedConsumption,
      stack: compare ? "devicesCompare" : "devices",
    };
    return dataset;
  }

  private _processDataSet(
    computedStyle: CSSStyleDeclaration,
    statistics: Statistics,
    statisticsMetaData: Record<string, StatisticsMetaData>,
    devices: DeviceConsumptionEnergyPreference[],
    sorted_devices: string[],
    childMap: Record<string, string[]>,
    compare = false
  ) {
    const data: BarSeriesOption[] = [];
    const compareTransform = getCompareTransform(
      this._start,
      this._compareStart!
    );

    devices.forEach((source, idx) => {
      const order = sorted_devices.indexOf(source.stat_consumption);
      if (this._config?.max_devices && order >= this._config.max_devices) {
        // eslint-disable-next-line no-console
        console.warn(
          `Max devices exceeded for ${source.name} (${order} >= ${this._config.max_devices})`
        );
        return;
      }
      const color = getGraphColorByIndex(idx, computedStyle);

      let prevStart: number | null = null;

      const consumptionData: BarSeriesOption["data"] = [];

      // Process device consumption data.
      if (source.stat_consumption in statistics) {
        const stats = statistics[source.stat_consumption];

        for (const point of stats) {
          if (
            point.change === null ||
            point.change === undefined ||
            point.change === 0
          ) {
            continue;
          }
          if (prevStart === point.start) {
            continue;
          }
          let sumChildren = 0;
          const children = childMap[source.stat_consumption] || [];
          children.forEach((c) => {
            const cStats = statistics[c];
            sumChildren +=
              cStats?.find((cStat) => cStat.start === point.start)?.change || 0;
          });

          const dataPoint = [point.start, point.change - sumChildren];
          if (compare) {
            dataPoint[2] = dataPoint[0];
            dataPoint[0] = compareTransform(new Date(point.start)).getTime();
          }
          consumptionData.push(dataPoint);
          prevStart = point.start;
        }
      }

      const name =
        (source.name ||
          getStatisticLabel(
            this.hass,
            source.stat_consumption,
            statisticsMetaData[source.stat_consumption]
          )) +
        (source.stat_consumption in childMap
          ? ` (${this.hass.localize("ui.panel.lovelace.cards.energy.energy_devices_detail_graph.untracked")})`
          : "");

      data.push({
        type: "bar",
        cursor: "default",
        // add order to id, otherwise echarts refuses to reorder them
        id: compare
          ? `compare-${source.stat_consumption}-${order}`
          : `${source.stat_consumption}-${order}`,
        name,
        itemStyle: {
          borderColor: compare ? color + "7F" : color,
        },
        barMaxWidth: 50,
        color: compare ? color + "32" : color + "7F",
        data: consumptionData,
        stack: compare ? "devicesCompare" : "devices",
      });
    });
    return sorted_devices
      .map(
        (device) =>
          data.find((d) => this._getStatIdFromId(d.id as string) === device)!
      )
      .filter(Boolean);
  }

  private _getStatIdFromId(id: string): string {
    return id
      .replace(/^compare-/, "") // Remove compare- prefix
      .replace(/-\d+$/, ""); // Remove numeric suffix
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
