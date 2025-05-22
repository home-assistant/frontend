import { consume } from "@lit/context";
import { ResizeController } from "@lit-labs/observers/resize-controller";
import { mdiChevronDown, mdiChevronUp, mdiRestart } from "@mdi/js";
import { differenceInMinutes } from "date-fns";
import type { DataZoomComponentOption } from "echarts/components";
import type { EChartsType } from "echarts/core";
import type {
  ECElementEvent,
  LegendComponentOption,
  XAXisOption,
  YAXisOption,
} from "echarts/types/dist/shared";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { getAllGraphColors } from "../../common/color/colors";
import { fireEvent } from "../../common/dom/fire_event";
import { listenMediaQuery } from "../../common/dom/media_query";
import { themesContext } from "../../data/context";
import type { Themes } from "../../data/ws-themes";
import type { ECOption } from "../../resources/echarts";
import type { HomeAssistant } from "../../types";
import { isMac } from "../../util/is_mac";
import "../ha-icon-button";
import { formatTimeLabel } from "./axis-label";
import { ensureArray } from "../../common/array/ensure-array";
import "../chips/ha-assist-chip";

export const MIN_TIME_BETWEEN_UPDATES = 60 * 5 * 1000;
const LEGEND_OVERFLOW_LIMIT = 10;
const LEGEND_OVERFLOW_LIMIT_MOBILE = 6;
const DOUBLE_TAP_TIME = 300;

@customElement("ha-chart-base")
export class HaChartBase extends LitElement {
  public chart?: EChartsType;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public data: ECOption["series"] = [];

  @property({ attribute: false }) public options?: ECOption;

  @property({ type: String }) public height?: string;

  @property({ attribute: "expand-legend", type: Boolean })
  public expandLegend?: boolean;

  // extraComponents is not reactive and should not trigger updates
  public extraComponents?: any[];

  @state()
  @consume({ context: themesContext, subscribe: true })
  _themes!: Themes;

  @state() private _isZoomed = false;

  @state() private _zoomRatio = 1;

  @state() private _minutesDifference = 24 * 60;

  @state() private _hiddenDatasets = new Set<string>();

  private _modifierPressed = false;

  private _isTouchDevice = "ontouchstart" in window;

  private _lastTapTime?: number;

  // @ts-ignore
  private _resizeController = new ResizeController(this, {
    callback: () => this.chart?.resize(),
  });

  private _loading = false;

  private _reducedMotion = false;

  private _listeners: (() => void)[] = [];

  private _originalZrFlush?: () => void;

  public disconnectedCallback() {
    super.disconnectedCallback();
    while (this._listeners.length) {
      this._listeners.pop()!();
    }
    this.chart?.dispose();
    this.chart = undefined;
    this._originalZrFlush = undefined;
  }

  public connectedCallback() {
    super.connectedCallback();
    if (this.hasUpdated) {
      this._setupChart();
    }

    this._listeners.push(
      listenMediaQuery("(prefers-reduced-motion)", (matches) => {
        if (this._reducedMotion !== matches) {
          this._reducedMotion = matches;
          this._setChartOptions({ animation: !this._reducedMotion });
        }
      })
    );

    if (!this.options?.dataZoom) {
      // Add keyboard event listeners
      const handleKeyDown = (ev: KeyboardEvent) => {
        if (
          !this._modifierPressed &&
          ((isMac && ev.key === "Meta") || (!isMac && ev.key === "Control"))
        ) {
          this._modifierPressed = true;
          if (!this.options?.dataZoom) {
            this._setChartOptions({ dataZoom: this._getDataZoomConfig() });
          }
          // drag to zoom
          this.chart?.dispatchAction({
            type: "takeGlobalCursor",
            key: "dataZoomSelect",
            dataZoomSelectActive: true,
          });
        }
      };

      const handleKeyUp = (ev: KeyboardEvent) => {
        if (
          this._modifierPressed &&
          ((isMac && ev.key === "Meta") || (!isMac && ev.key === "Control"))
        ) {
          this._modifierPressed = false;
          if (!this.options?.dataZoom) {
            this._setChartOptions({ dataZoom: this._getDataZoomConfig() });
          }
          this.chart?.dispatchAction({
            type: "takeGlobalCursor",
            key: "dataZoomSelect",
            dataZoomSelectActive: false,
          });
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);
      this._listeners.push(
        () => window.removeEventListener("keydown", handleKeyDown),
        () => window.removeEventListener("keyup", handleKeyUp)
      );
    }
  }

  protected firstUpdated() {
    this._setupChart();
  }

  public willUpdate(changedProps: PropertyValues): void {
    if (!this.chart) {
      return;
    }
    if (changedProps.has("_themes")) {
      this._setupChart();
      return;
    }
    let chartOptions: ECOption = {};
    if (changedProps.has("data") || changedProps.has("_hiddenDatasets")) {
      chartOptions.series = this._getSeries();
    }
    if (changedProps.has("options")) {
      chartOptions = { ...chartOptions, ...this._createOptions() };
    } else if (this._isTouchDevice && changedProps.has("_isZoomed")) {
      chartOptions.dataZoom = this._getDataZoomConfig();
    }
    if (Object.keys(chartOptions).length > 0) {
      this._setChartOptions(chartOptions);
    }
  }

  protected render() {
    return html`
      <div
        class="container ${classMap({ "has-height": !!this.height })}"
        style=${styleMap({ height: this.height })}
      >
        <div
          class="chart-container"
          style=${styleMap({
            height: this.height ? undefined : `${this._getDefaultHeight()}px`,
          })}
        >
          <div class="chart"></div>
        </div>
        ${this._renderLegend()}
        <div class="chart-controls">
          ${this._isZoomed
            ? html`<ha-icon-button
                class="zoom-reset"
                .path=${mdiRestart}
                @click=${this._handleZoomReset}
                title=${this.hass.localize(
                  "ui.components.history_charts.zoom_reset"
                )}
              ></ha-icon-button>`
            : nothing}
          <slot name="button"></slot>
        </div>
      </div>
    `;
  }

  private _renderLegend() {
    if (!this.options?.legend || !this.data) {
      return nothing;
    }
    const legend = ensureArray(this.options.legend)[0] as LegendComponentOption;
    if (!legend.show || legend.type !== "custom") {
      return nothing;
    }
    const datasets = ensureArray(this.data);
    const items = (legend.data ||
      datasets
        .filter((d) => (d.data as any[])?.length && (d.id || d.name))
        .map((d) => d.name ?? d.id) ||
      []) as string[];

    const isMobile = window.matchMedia(
      "all and (max-width: 450px), all and (max-height: 500px)"
    ).matches;
    const overflowLimit = isMobile
      ? LEGEND_OVERFLOW_LIMIT_MOBILE
      : LEGEND_OVERFLOW_LIMIT;
    return html`<div
      class=${classMap({
        "chart-legend": true,
        "multiple-items": items.length > 1,
      })}
    >
      <ul>
        ${items.map((item: string, index: number) => {
          if (!this.expandLegend && index >= overflowLimit) {
            return nothing;
          }
          const dataset = datasets.find(
            (d) => d.id === item || d.name === item
          );
          const color = dataset?.color as string;
          const borderColor = dataset?.itemStyle?.borderColor as string;
          return html`<li
            .name=${item}
            @click=${this._legendClick}
            class=${classMap({ hidden: this._hiddenDatasets.has(item) })}
            .title=${item}
          >
            <div
              class="bullet"
              style=${styleMap({
                backgroundColor: color,
                borderColor: borderColor || color,
              })}
            ></div>
            <div class="label">${item}</div>
          </li>`;
        })}
        ${items.length > overflowLimit
          ? html`<li>
              <ha-assist-chip
                @click=${this._toggleExpandedLegend}
                filled
                label=${this.expandLegend
                  ? this.hass.localize(
                      "ui.components.history_charts.collapse_legend"
                    )
                  : `${this.hass.localize(
                      "ui.components.history_charts.expand_legend"
                    )} (${items.length - overflowLimit})`}
              >
                <ha-svg-icon
                  slot="trailing-icon"
                  .path=${this.expandLegend ? mdiChevronUp : mdiChevronDown}
                ></ha-svg-icon>
              </ha-assist-chip>
            </li>`
          : nothing}
      </ul>
    </div>`;
  }

  private _formatTimeLabel = (value: number | Date) =>
    formatTimeLabel(
      value,
      this.hass.locale,
      this.hass.config,
      this._minutesDifference * this._zoomRatio
    );

  private async _setupChart() {
    if (this._loading) return;
    const container = this.renderRoot.querySelector(".chart") as HTMLDivElement;
    this._loading = true;
    try {
      if (this.chart) {
        this.chart.dispose();
      }
      const echarts = (await import("../../resources/echarts")).default;

      if (this.extraComponents?.length) {
        echarts.use(this.extraComponents);
      }

      echarts.registerTheme("custom", this._createTheme());

      this.chart = echarts.init(container, "custom");
      this.chart.on("datazoom", (e: any) => {
        const { start, end } = e.batch?.[0] ?? e;
        this._isZoomed = start !== 0 || end !== 100;
        this._zoomRatio = (end - start) / 100;
      });
      this.chart.on("click", (e: ECElementEvent) => {
        fireEvent(this, "chart-click", e);
      });
      if (!this.options?.dataZoom) {
        this.chart.getZr().on("dblclick", this._handleClickZoom);
      }
      if (this._isTouchDevice) {
        this.chart.getZr().on("click", (e: ECElementEvent) => {
          if (!e.zrByTouch) {
            return;
          }
          if (
            this._lastTapTime &&
            Date.now() - this._lastTapTime < DOUBLE_TAP_TIME
          ) {
            this._handleClickZoom(e);
          } else {
            this._lastTapTime = Date.now();
          }
        });
      }

      const legend = ensureArray(this.options?.legend || [])[0] as
        | LegendComponentOption
        | undefined;
      Object.entries(legend?.selected || {}).forEach(([stat, selected]) => {
        if (selected === false) {
          this._hiddenDatasets.add(stat);
        }
      });

      this.chart.setOption({
        ...this._createOptions(),
        series: this._getSeries(),
      });
    } finally {
      this._loading = false;
    }
  }

  private _getDataZoomConfig(): DataZoomComponentOption | undefined {
    const xAxis = (this.options?.xAxis?.[0] ?? this.options?.xAxis) as
      | XAXisOption
      | undefined;
    const yAxis = (this.options?.yAxis?.[0] ?? this.options?.yAxis) as
      | YAXisOption
      | undefined;
    if (xAxis?.type === "value" && yAxis?.type === "category") {
      // vertical data zoom doesn't work well in this case and horizontal is pointless
      return undefined;
    }
    return {
      id: "dataZoom",
      type: "inside",
      orient: "horizontal",
      filterMode: "none",
      moveOnMouseMove: !this._isTouchDevice || this._isZoomed,
      preventDefaultMouseMove: !this._isTouchDevice || this._isZoomed,
      zoomLock: !this._isTouchDevice && !this._modifierPressed,
    };
  }

  private _createOptions(): ECOption {
    let xAxis = this.options?.xAxis;
    if (xAxis) {
      xAxis = Array.isArray(xAxis) ? xAxis : [xAxis];
      xAxis = xAxis.map((axis: XAXisOption) => {
        if (axis.type !== "time" || axis.show === false) {
          return axis;
        }
        if (axis.max && axis.min) {
          this._minutesDifference = differenceInMinutes(
            axis.max as Date,
            axis.min as Date
          );
        }
        const dayDifference = this._minutesDifference / 60 / 24;
        let minInterval: number | undefined;
        if (dayDifference) {
          minInterval =
            dayDifference >= 89 // quarter
              ? 28 * 3600 * 24 * 1000
              : dayDifference > 2
                ? 3600 * 24 * 1000
                : undefined;
        }
        return {
          axisLine: { show: false },
          splitLine: { show: true },
          ...axis,
          axisLabel: {
            formatter: this._formatTimeLabel,
            rich: { bold: { fontWeight: "bold" } },
            hideOverlap: true,
            ...axis.axisLabel,
          },
          minInterval,
        } as XAXisOption;
      });
    }
    let legend = this.options?.legend;
    if (legend) {
      legend = ensureArray(legend).map((l) =>
        l.type === "custom" ? { show: false } : l
      );
    }
    const options = {
      animation: !this._reducedMotion,
      darkMode: this._themes.darkMode ?? false,
      aria: { show: true },
      dataZoom: this._getDataZoomConfig(),
      toolbox: {
        top: Infinity,
        left: Infinity,
        feature: {
          dataZoom: { show: true, yAxisIndex: false, filterMode: "none" },
        },
        iconStyle: { opacity: 0 },
      },
      ...this.options,
      legend,
      xAxis,
    };

    const isMobile = window.matchMedia(
      "all and (max-width: 450px), all and (max-height: 500px)"
    ).matches;
    if (isMobile && options.tooltip) {
      // mobile charts are full width so we need to confine the tooltip to the chart
      const tooltips = Array.isArray(options.tooltip)
        ? options.tooltip
        : [options.tooltip];
      tooltips.forEach((tooltip) => {
        tooltip.confine = true;
        tooltip.appendTo = undefined;
        tooltip.triggerOn = "click";
      });
      options.tooltip = tooltips;
    }
    return options;
  }

  private _createTheme() {
    const style = getComputedStyle(this);
    return {
      color: getAllGraphColors(style),
      backgroundColor: "transparent",
      textStyle: {
        color: style.getPropertyValue("--primary-text-color"),
        fontFamily: "Roboto, Noto, sans-serif",
      },
      title: {
        textStyle: { color: style.getPropertyValue("--primary-text-color") },
        subtextStyle: {
          color: style.getPropertyValue("--secondary-text-color"),
        },
      },
      line: {
        lineStyle: { width: 1.5 },
        symbolSize: 1,
        symbol: "circle",
        smooth: false,
      },
      bar: { itemStyle: { barBorderWidth: 1.5 } },
      categoryAxis: {
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          show: true,
          color: style.getPropertyValue("--primary-text-color"),
        },
        splitLine: {
          show: false,
          lineStyle: { color: style.getPropertyValue("--divider-color") },
        },
        splitArea: {
          show: false,
          areaStyle: {
            color: [
              style.getPropertyValue("--divider-color") + "3F",
              style.getPropertyValue("--divider-color") + "7F",
            ],
          },
        },
      },
      valueAxis: {
        axisLine: {
          show: true,
          lineStyle: { color: style.getPropertyValue("--divider-color") },
        },
        axisTick: {
          show: true,
          lineStyle: { color: style.getPropertyValue("--divider-color") },
        },
        axisLabel: {
          show: true,
          color: style.getPropertyValue("--primary-text-color"),
        },
        splitLine: {
          show: true,
          lineStyle: { color: style.getPropertyValue("--divider-color") },
        },
        splitArea: {
          show: false,
          areaStyle: {
            color: [
              style.getPropertyValue("--divider-color") + "3F",
              style.getPropertyValue("--divider-color") + "7F",
            ],
          },
        },
      },
      logAxis: {
        axisLine: {
          show: true,
          lineStyle: { color: style.getPropertyValue("--divider-color") },
        },
        axisTick: {
          show: true,
          lineStyle: { color: style.getPropertyValue("--divider-color") },
        },
        axisLabel: {
          show: true,
          color: style.getPropertyValue("--primary-text-color"),
        },
        splitLine: {
          show: true,
          lineStyle: { color: style.getPropertyValue("--divider-color") },
        },
        splitArea: {
          show: false,
          areaStyle: {
            color: [
              style.getPropertyValue("--divider-color") + "3F",
              style.getPropertyValue("--divider-color") + "7F",
            ],
          },
        },
      },
      timeAxis: {
        axisLine: {
          show: true,
          lineStyle: { color: style.getPropertyValue("--divider-color") },
        },
        axisTick: {
          show: true,
          lineStyle: { color: style.getPropertyValue("--divider-color") },
        },
        axisLabel: {
          show: true,
          color: style.getPropertyValue("--primary-text-color"),
        },
        splitLine: {
          show: true,
          lineStyle: { color: style.getPropertyValue("--divider-color") },
        },
        splitArea: {
          show: false,
          areaStyle: {
            color: [
              style.getPropertyValue("--divider-color") + "3F",
              style.getPropertyValue("--divider-color") + "7F",
            ],
          },
        },
      },
      legend: {
        textStyle: { color: style.getPropertyValue("--primary-text-color") },
        inactiveColor: style.getPropertyValue("--disabled-text-color"),
        pageIconColor: style.getPropertyValue("--primary-text-color"),
        pageIconInactiveColor: style.getPropertyValue("--disabled-text-color"),
        pageTextStyle: {
          color: style.getPropertyValue("--secondary-text-color"),
        },
      },
      tooltip: {
        backgroundColor: style.getPropertyValue("--card-background-color"),
        borderColor: style.getPropertyValue("--divider-color"),
        textStyle: {
          color: style.getPropertyValue("--primary-text-color"),
          fontSize: 12,
        },
        axisPointer: {
          lineStyle: { color: style.getPropertyValue("--info-color") },
          crossStyle: { color: style.getPropertyValue("--info-color") },
        },
        extraCssText:
          "direction:" +
          style.getPropertyValue("--direction") +
          ";margin-inline-start:3px;margin-inline-end:8px;",
      },
      timeline: {},
    };
  }

  private _getSeries() {
    const series = ensureArray(this.data).filter(
      (d) => !this._hiddenDatasets.has(String(d.name ?? d.id))
    );
    const yAxis = (this.options?.yAxis?.[0] ?? this.options?.yAxis) as
      | YAXisOption
      | undefined;
    if (yAxis?.type === "log") {
      // set <=0 values to null so they render as gaps on a log graph
      return series.map((d) =>
        d.type === "line"
          ? {
              ...d,
              data: d.data?.map((v) =>
                Array.isArray(v)
                  ? [
                      v[0],
                      typeof v[1] !== "number" || v[1] > 0 ? v[1] : null,
                      ...v.slice(2),
                    ]
                  : v
              ),
            }
          : d
      );
    }
    return series;
  }

  private _getDefaultHeight() {
    return Math.max(this.clientWidth / 2, 200);
  }

  private _setChartOptions(options: ECOption) {
    if (!this.chart) {
      return;
    }
    if (!this._originalZrFlush) {
      const dataSize = ensureArray(this.data).reduce(
        (acc, series) => acc + ((series.data as any[]) || []).length,
        0
      );
      if (dataSize > 10000) {
        // delay the last bit of the render to avoid blocking the main thread
        // this is not that impactful with sampling enabled but it doesn't hurt to have it
        const zr = this.chart.getZr();
        this._originalZrFlush = zr.flush;
        zr.flush = () => {
          setTimeout(() => {
            this._originalZrFlush?.call(zr);
          }, 5);
        };
      }
    }
    const replaceMerge = options.series ? ["series"] : [];
    this.chart.setOption(options, { replaceMerge });
  }

  private _handleClickZoom = (e: ECElementEvent) => {
    if (!this.chart) {
      return;
    }
    const range = this._isZoomed
      ? [0, 100]
      : [
          (e.offsetX / this.chart.getWidth()) * 100 - 15,
          (e.offsetX / this.chart.getWidth()) * 100 + 15,
        ];
    this.chart.dispatchAction({
      type: "dataZoom",
      start: range[0],
      end: range[1],
    });
  };

  private _handleZoomReset() {
    this.chart?.dispatchAction({ type: "dataZoom", start: 0, end: 100 });
  }

  private _legendClick(ev: any) {
    if (!this.chart) {
      return;
    }
    const name = ev.currentTarget?.name;
    if (this._hiddenDatasets.has(name)) {
      this._hiddenDatasets.delete(name);
      fireEvent(this, "dataset-unhidden", { name });
    } else {
      this._hiddenDatasets.add(name);
      fireEvent(this, "dataset-hidden", { name });
    }
    this.requestUpdate("_hiddenDatasets");
  }

  private _toggleExpandedLegend() {
    this.expandLegend = !this.expandLegend;
    setTimeout(() => {
      this.chart?.resize();
    });
  }

  static styles = css`
    :host {
      display: block;
      position: relative;
      letter-spacing: normal;
    }
    .container {
      display: flex;
      flex-direction: column;
      position: relative;
    }
    .container.has-height {
      max-height: var(--chart-max-height, 350px);
    }
    .chart-container {
      width: 100%;
      max-height: var(--chart-max-height, 350px);
    }
    .has-height .chart-container {
      flex: 1;
    }
    .chart {
      height: 100%;
      width: 100%;
    }
    .chart-controls {
      position: absolute;
      top: 16px;
      right: 4px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .chart-controls ha-icon-button,
    .chart-controls ::slotted(ha-icon-button) {
      background: var(--card-background-color);
      border-radius: 4px;
      --mdc-icon-button-size: 32px;
      color: var(--primary-color);
      border: 1px solid var(--divider-color);
    }
    .chart-controls ha-icon-button.inactive,
    .chart-controls ::slotted(ha-icon-button.inactive) {
      color: var(--state-inactive-color);
    }
    .chart-legend {
      max-height: 60%;
      overflow-y: auto;
      padding: 12px 0 0;
      font-size: var(--ha-font-size-s);
      color: var(--primary-text-color);
    }
    .chart-legend ul {
      margin: 0;
      padding: 0;
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;
      gap: 8px;
    }
    .chart-legend li {
      height: 24px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      padding: 0 2px;
      box-sizing: border-box;
      overflow: hidden;
    }
    .chart-legend.multiple-items li {
      max-width: 220px;
    }
    .chart-legend .hidden {
      color: var(--secondary-text-color);
    }
    .chart-legend .label {
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;
    }
    .chart-legend .bullet {
      border-width: 1px;
      border-style: solid;
      border-radius: 50%;
      display: block;
      height: 16px;
      width: 16px;
      margin-right: 4px;
      flex-shrink: 0;
      box-sizing: border-box;
      margin-inline-end: 4px;
      margin-inline-start: initial;
      direction: var(--direction);
    }
    .chart-legend .hidden .bullet {
      border-color: var(--secondary-text-color) !important;
      background-color: transparent !important;
    }
    ha-assist-chip {
      height: 100%;
      --_label-text-weight: 500;
      --_leading-space: 8px;
      --_trailing-space: 8px;
      --_icon-label-space: 4px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-chart-base": HaChartBase;
  }
  interface HASSDomEvents {
    "dataset-hidden": { name: string };
    "dataset-unhidden": { name: string };
    "chart-click": ECElementEvent;
  }
}
