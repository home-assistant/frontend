import type { HassEntities } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { mdiChartDonut, mdiChartBar } from "@mdi/js";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import type { BarSeriesOption, PieSeriesOption } from "echarts/charts";
import { PieChart } from "echarts/charts";
import type { ECElementEvent } from "echarts/types/dist/shared";
import type { PieDataItemOption } from "echarts/types/src/chart/pie/PieSeries";
import {
  consume,
  ContextSubscriptionController,
} from "../../../../common/decorators/consume";
import { getGraphColorByIndex } from "../../../../common/color/colors";
import "../../../../components/chart/ha-chart-base";
import "../../../../components/chart/ha-chart-tooltip-marker";
import {
  formattersContext,
  internationalizationContext,
  registriesContext,
  statesContext,
} from "../../../../data/context";
import type { EnergyData } from "../../../../data/energy";
import {
  computeEnergyDeviceLabels,
  computeEnergyStatisticArea,
  formatPowerShort,
  validateEnergyCollectionKey,
} from "../../../../data/energy";
import { EnergyCollectionController } from "../../../../data/energy-collection-controller";
import { MobileAwareMixin } from "../../../../mixins/mobile-aware-mixin";
import {
  getStatisticLabel,
  isExternalStatistic,
} from "../../../../data/recorder";
import type {
  HomeAssistant,
  HomeAssistantFormatters,
  HomeAssistantInternationalization,
  HomeAssistantRegistries,
} from "../../../../types";
import type { LovelaceCard } from "../../types";
import type { HaECOption } from "../../../../resources/echarts/echarts";
import "../../../../components/ha-card";
import type { HASSDomEvent } from "../../../../common/dom/fire_event";
import { fireEvent } from "../../../../common/dom/fire_event";
import { measureTextWidth } from "../../../../util/text";
import "../../../../components/ha-icon-button";
import { storage } from "../../../../common/decorators/storage";
import type { CustomLegendOption } from "../../../../components/chart/ha-chart-base";
import type { PowerDevicesGraphCardConfig } from "../types";
import { formatNumber } from "../../../../common/number/format_number";

const UNIT_TO_KW: Record<string, number> = {
  mW: 0.000001,
  W: 0.001,
  kW: 1,
  MW: 1000,
  GW: 1000000,
  TW: 1000000000,
};
const EXTRA_COMPONENTS = [PieChart];

@customElement("hui-power-devices-graph-card")
export class HuiPowerDevicesGraphCard
  extends MobileAwareMixin(LitElement)
  implements LovelaceCard
{
  public static async getConfigElement() {
    await import("../../editor/config-elements/hui-power-devices-card-editor");
    return document.createElement("hui-power-devices-card-editor");
  }

  public static getStubConfig(
    _hass: HomeAssistant,
    _entities: string[],
    _entitiesFill: string[]
  ): PowerDevicesGraphCardConfig {
    return {
      type: "power-devices-graph",
    };
  }

  @state() private _config?: PowerDevicesGraphCardConfig;

  @state() private _chartData: (BarSeriesOption | PieSeriesOption)[] = [];

  @state() private _data?: EnergyData;

  @state() private _legendData: NonNullable<CustomLegendOption["data"]> = [];

  @state()
  @storage({
    key: "power-devices-graph-chart-type",
    state: true,
    subscribe: false,
  })
  private _chartType?: "bar" | "pie";

  @state()
  @storage({
    key: "power-devices-pie-hidden-stats",
    state: true,
    subscribe: false,
  })
  private _hiddenStats: string[] = [];

  // stat_rate ids of devices that contain other devices
  private _compoundStats: string[] = [];

  // stat_rate id -> label
  private _deviceLabels: Record<string, string> = {};

  // Used to recompute only when a relevant power value actually changes
  private _lastSignature = "";

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: HomeAssistantInternationalization;

  private _states: HassEntities = {};

  @consume({ context: formattersContext, subscribe: true })
  private _formatters!: HomeAssistantFormatters;

  @consume({ context: registriesContext, subscribe: true })
  private _registries!: HomeAssistantRegistries;

  constructor() {
    super();
    new EnergyCollectionController(this, {
      config: () => this._config,
      onData: (data) => {
        this._data = data;
        this._lastSignature = this._computeSignature();
        this._getStatistics(data);
      },
    });
    new ContextSubscriptionController(this, statesContext, (states) => {
      this._states = states;
      if (!this._data) {
        return;
      }
      const signature = this._computeSignature();
      if (signature !== this._lastSignature) {
        this._lastSignature = signature;
        this._getStatistics(this._data);
      }
    });
  }
  public getCardSize(): Promise<number> | number {
    return 3;
  }

  public setConfig(config: PowerDevicesGraphCardConfig): void {
    if (config.collection_key) {
      validateEnergyCollectionKey(config.collection_key);
    }
    this._config = config;
  }

  private _getAllowedModes(): ("bar" | "pie")[] {
    // Empty array or undefined = allow all modes
    if (!this._config?.modes || this._config.modes.length === 0) {
      return ["bar", "pie"];
    }
    return this._config.modes;
  }
  private _toKw(entityId: string): number {
    const stateObj = this._states?.[entityId];
    if (!stateObj) {
      return 0;
    }
    const value = Number(stateObj.state);
    if (isNaN(value)) {
      return 0;
    }
    const unit = stateObj.attributes.unit_of_measurement as string | undefined;
    const factor = unit ? (UNIT_TO_KW[unit] ?? 1) : 1;
    return value * factor;
  }

  private _computeSignature(): string {
    if (!this._data) {
      return "";
    }
    return this._data.prefs.device_consumption
      .filter((d) => d.stat_rate)
      .map((d) => {
        const rate = d.stat_rate as string;
        return `${rate}:${this._toKw(rate)}`;
      })
      .join("|");
  }
  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);

    if (changedProps.has("_config") && this._config) {
      const allowedModes = this._getAllowedModes();
      if (!this._chartType || !allowedModes.includes(this._chartType)) {
        this._chartType = allowedModes[0];
      }
    }
    if (
      (changedProps.has("_config") || changedProps.has("_i18n")) &&
      this._data
    ) {
      this._getStatistics(this._data);
    }
  }

  protected render() {
    if (!this._config || !this._chartType) {
      return nothing;
    }

    const modes = this._getAllowedModes();

    return html`
      <ha-card>
        <div class="card-header">
          <span>${this._config.title ? this._config.title : nothing}</span>
          ${
            modes.length > 1
              ? html`
                  <ha-icon-button
                    .path=${
                      this._chartType === "pie" ? mdiChartBar : mdiChartDonut
                    }
                    .label=${this._i18n.localize(
                      "ui.panel.lovelace.cards.energy.power_devices_graph.change_chart_type"
                    )}
                    @click=${this._handleChartTypeChange}
                  ></ha-icon-button>
                `
              : nothing
          }
        </div>
        <div
          class="content ${classMap({
            "has-header": !!this._config.title,
          })}"
        >
          <ha-chart-base
            .data=${this._chartData}
            .options=${this._createOptions(
              this._chartData,
              this._chartType,
              this._legendData
            )}
            .height=${`${Math.max(
              modes.includes("pie") ? 300 : 100,
              (this._legendData?.length || 0) * 28 + 50
            )}px`}
            .extraComponents=${EXTRA_COMPONENTS}
            .sonificationLabelFormatter=${this._getDeviceName}
            .expandLegend=${this._config.expand_legend}
            click-label-for-more-info
            @chart-click=${this._handleChartClick}
            @dataset-hidden=${this._datasetHidden}
            @dataset-unhidden=${this._datasetUnhidden}
            @legend-label-click=${this._handleLegendLabelClick}
          ></ha-chart-base>
        </div>
      </ha-card>
    `;
  }

  private _renderTooltip = (params: any) => {
    const deviceName = this._getDeviceName(params.name);
    const area = computeEnergyStatisticArea(this._registries, params.name);
    const value = `${formatPowerShort(
      this._i18n.locale,
      (params.value as number[])[0] * 1000
    )} ${params.percent ? `(${params.percent} %)` : ""}`;
    return html`<h4 style="text-align: center; margin: 0;">${deviceName}</h4>
      ${
        area
          ? html`<div
              style="text-align: center; color: var(--secondary-text-color);"
            >
              ${area}
            </div>`
          : nothing
      }
      <ha-chart-tooltip-marker
        .color=${String(params.color ?? "")}
      ></ha-chart-tooltip-marker>
      ${params.seriesName}:
      <div style="direction:ltr; display: inline;">${value}</div>`;
  };

  private _createOptions = memoizeOne(
    (
      data: (BarSeriesOption | PieSeriesOption)[],
      chartType: "bar" | "pie",
      legendData: typeof this._legendData
    ): HaECOption => {
      const options: HaECOption = {
        grid: {
          top: 5,
          left: 5,
          right: 40,
          bottom: 0,
          containLabel: true,
        },
        tooltip: {
          show: true,
          formatter: this._renderTooltip,
        },
        xAxis: { show: false },
        yAxis: { show: false },
        legend: { type: "custom", show: false },
      };
      if (chartType === "bar") {
        const maxKw = Math.max(
          0,
          ...(data[0]?.data?.map((d: any) => d.value[0]) ?? [])
        );
        const [unit, factor] =
          maxKw < 1 ? ["W", 1000] : maxKw >= 1000 ? ["MW", 0.001] : ["kW", 1];
        options.xAxis = {
          show: true,
          type: "value",
          name: unit,
          axisLabel: {
            formatter: (value: number) =>
              formatNumber(value * factor, this._i18n.locale, {
                maximumFractionDigits: 2,
              }),
          },
          axisPointer: {
            show: false,
          },
        };
        options.yAxis = {
          show: true,
          type: "category",
          inverse: true,
          triggerEvent: true,
          // take order from data
          data: data[0]?.data?.map((d: any) => d.name),
          axisLabel: {
            formatter: this._getDeviceName.bind(this),
            overflow: "truncate",
            fontSize: 12,
            margin: 5,
            width: Math.min(
              this._isMobileSize ? 100 : 200,
              Math.max(
                ...(data[0]?.data?.map(
                  (d: any) =>
                    measureTextWidth(this._getDeviceName(d.name), 12) + 5
                ) || [])
              )
            ),
          },
        };
      } else {
        options.legend = {
          type: "custom",
          show: true,
          data: legendData,
          selected: legendData
            .filter((d) => d.id && this._hiddenStats.includes(d.id))
            .reduce((acc, d) => {
              acc[d.id!] = false;
              return acc;
            }, {}),
        };
      }
      return options;
    }
  );

  private _getDeviceName(statisticId: string): string {
    const suffix = this._compoundStats.includes(statisticId)
      ? ` (${this._i18n.localize(
          "ui.panel.lovelace.cards.energy.power_devices_graph.untracked"
        )})`
      : "";
    return (
      (this._deviceLabels[statisticId] ||
        getStatisticLabel(
          this._states,
          this._formatters.formatEntityName,
          statisticId,
          undefined
        )) + suffix
    );
  }

  private _animateNext = false;
  private _getStatistics(energyData: EnergyData): void {
    if (!this._chartType) {
      return;
    }
    const animate = this._animateNext;
    this._animateNext = false;
    const updateDuration = animate ? 500 : 0;

    const chartData: NonNullable<(BarSeriesOption | PieSeriesOption)["data"]> =
      [];

    const datasets: (BarSeriesOption | PieSeriesOption)[] = [
      {
        type: this._chartType,
        radius: ["40%", "70%"],
        universalTransition: true,
        animationDurationUpdate: updateDuration,
        name: this._i18n.localize(
          "ui.panel.lovelace.cards.energy.power_devices_graph.power_usage"
        ),
        itemStyle: {
          borderRadius: this._chartType === "bar" ? [0, 4, 4, 0] : 4,
        },
        data: chartData,
        barWidth: 20,
        cursor: "default",
        minShowLabelAngle: 15,
        label:
          this._chartType === "pie"
            ? {
                formatter: ({ name }) => this._getDeviceName(name),
                overflow: "break",
                alignTo: this._isMobileSize ? "edge" : "none",
                edgeDistance: 1,
              }
            : undefined,
        labelLine: {
          length2: 10,
        },
      } as BarSeriesOption | PieSeriesOption,
    ];

    const computedStyle = getComputedStyle(this);

    // Only devices with a power sensor can be shown
    const devices = energyData.prefs.device_consumption.filter(
      (d) => d.stat_rate
    );

    // Resolve the nearest ancestor that also has a power sensor.
    const deviceByConsumption = new Map<string, (typeof devices)[number]>(
      energyData.prefs.device_consumption.map((device) => [
        device.stat_consumption,
        device,
      ])
    );

    const parentRate = (d: (typeof devices)[number]): string | undefined => {
      let parentId = d.included_in_stat;
      for (let hops = 0; parentId && hops < deviceByConsumption.size; hops++) {
        const parent = deviceByConsumption.get(parentId);
        if (!parent) {
          return undefined;
        }
        if (parent.stat_rate) {
          return parent.stat_rate;
        }
        parentId = parent.included_in_stat;
      }
      return undefined;
    };

    this._compoundStats = devices
      .map((d) => parentRate(d))
      .filter(Boolean) as string[];

    // Labels are computed per stat_consumption, remap them to stat_rate
    const consumptionLabels = computeEnergyDeviceLabels(
      this._states,
      this._formatters.formatEntityName,
      energyData.prefs.device_consumption,
      energyData.statsMetadata
    );
    this._deviceLabels = {};
    devices.forEach((d) => {
      const label = consumptionLabels[d.stat_consumption];
      if (label) {
        this._deviceLabels[d.stat_rate!] = label;
      }
    });

    const devicesTotals: Record<string, number> = {};
    devices.forEach((device) => {
      devicesTotals[device.stat_rate!] = this._toKw(device.stat_rate!);
    });

    devices.forEach((device, idx) => {
      const rate = device.stat_rate!;
      let value = devicesTotals[rate];

      if (!this._config?.hide_compound_stats) {
        const childSum = devices.reduce(
          (acc, d) =>
            parentRate(d) === rate ? acc + devicesTotals[d.stat_rate!] : acc,
          0
        );
        value -= Math.min(value, childSum);
      } else if (this._compoundStats.includes(rate)) {
        return;
      }

      const color = getGraphColorByIndex(idx, computedStyle);

      chartData.push({
        id: rate,
        value: [value, rate] as any,
        name: rate,
        itemStyle: {
          color: color + "7F",
          borderColor: color,
        },
      });
    });

    chartData.sort((a: any, b: any) => b.value[0] - a.value[0]);
    if (
      this._config?.max_devices &&
      chartData.length > this._config.max_devices
    ) {
      chartData.splice(this._config.max_devices);
    }

    if (this._chartType === "pie") {
      const pieChartData = chartData as NonNullable<PieSeriesOption["data"]>;
      const totalChart = pieChartData.reduce(
        (acc: number, d) =>
          this._hiddenStats.includes((d as PieDataItemOption).id as string)
            ? acc
            : acc + (d as PieDataItemOption).value![0],
        0
      );
      datasets.push({
        type: "pie",
        radius: ["0%", "40%"],
        universalTransition: true,
        animationDurationUpdate: updateDuration,
        name: this._i18n.localize(
          "ui.panel.lovelace.cards.energy.power_devices_graph.total_power_usage"
        ),
        data: [totalChart],
        label: {
          show: true,
          position: "center",
          color: computedStyle.getPropertyValue("--secondary-text-color"),
          universalTransition: true,
          animationDurationUpdate: updateDuration,
          fontSize: computedStyle.getPropertyValue("--ha-font-size-m"),
          lineHeight: 24,
          fontWeight: "bold",
          formatter: `{a}\n${formatPowerShort(
            this._i18n.locale,
            totalChart * 1000
          )}`,
        },
        cursor: "default",
        itemStyle: {
          color: "rgba(0, 0, 0, 0)",
        },
        tooltip: {
          show: false,
        },
      } as PieSeriesOption);
    }

    this._legendData = chartData.map((d) => {
      const id = (d as any).id as string;
      return {
        ...d,
        name: this._getDeviceName(d.name),
        value: formatPowerShort(
          this._i18n.locale,
          (d.value as number[])[0] * 1000
        ),
        noLabelClick: isExternalStatistic(id) || !(id in this._states),
      };
    });

    // filter out hidden stats in place
    for (let i = chartData.length - 1; i >= 0; i--) {
      if (this._hiddenStats.includes((chartData[i] as any).id)) {
        chartData.splice(i, 1);
      }
    }

    this._chartData = datasets;
  }

  private _handleChartClick(e: CustomEvent<ECElementEvent>): void {
    if (
      e.detail.targetType === "axisLabel" &&
      e.detail.value &&
      !isExternalStatistic(e.detail.value as string)
    ) {
      fireEvent(this, "hass-more-info", {
        entityId: e.detail.value as string,
      });
    } else if (
      e.detail.seriesType === "pie" &&
      e.detail.event?.target?.type === "tspan" // label
    ) {
      const id = (e.detail.data as any).id as string;
      if (id && !isExternalStatistic(id) && this._states[id]) {
        fireEvent(this, "hass-more-info", {
          entityId: id,
        });
      }
    }
  }

  private _handleLegendLabelClick(
    ev: HASSDomEvent<HASSDomEvents["legend-label-click"]>
  ) {
    const entityId = ev.detail.id;
    if (isExternalStatistic(entityId) || !this._states[entityId]) {
      return;
    }
    fireEvent(this, "hass-more-info", { entityId });
  }

  private _handleChartTypeChange(): void {
    if (!this._chartType || !this._data) {
      return;
    }
    const allowedModes = this._getAllowedModes();
    const nextIndex =
      (allowedModes.indexOf(this._chartType) + 1) % allowedModes.length;
    this._chartType = allowedModes[nextIndex];
    this._animateNext = true;
    this._getStatistics(this._data);
  }

  private _datasetHidden(ev: CustomEvent<{ id: string }>) {
    this._hiddenStats = [...this._hiddenStats, ev.detail.id];
    this._animateNext = true;
    if (this._data) {
      this._getStatistics(this._data);
    }
  }

  private _datasetUnhidden(ev: CustomEvent<{ id: string }>) {
    this._hiddenStats = this._hiddenStats.filter((s) => s !== ev.detail.id);
    this._animateNext = true;
    if (this._data) {
      this._getStatistics(this._data);
    }
  }
  static styles = css`
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 0;
    }
    .content {
      padding: 16px;
    }
    .has-header {
      padding-top: 0;
    }
    ha-chart-base {
      --chart-max-height: none;
    }
    ha-icon-button {
      transform: rotate(90deg);
      color: var(--secondary-text-color);
      cursor: pointer;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-power-devices-graph-card": HuiPowerDevicesGraphCard;
  }
}
