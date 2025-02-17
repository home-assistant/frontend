import { consume } from "@lit-labs/context";
import { ResizeController } from "@lit-labs/observers/resize-controller";
import { mdiRestart } from "@mdi/js";
import { differenceInMinutes } from "date-fns";
import type { DataZoomComponentOption } from "echarts/components";
import type { EChartsType } from "echarts/core";
import type {
  ECElementEvent,
  LegendComponentOption,
  SetOptionOpts,
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
import "../ha-faded";

export const MIN_TIME_BETWEEN_UPDATES = 60 * 5 * 1000;

@customElement("ha-chart-base")
export class HaChartBase extends LitElement {
  public chart?: EChartsType;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public data: ECOption["series"] = [];

  @property({ attribute: false }) public options?: ECOption;

  @property({ type: String }) public height?: string;

  @state()
  @consume({ context: themesContext, subscribe: true })
  _themes!: Themes;

  @state() private _isZoomed = false;

  @state() private _zoomRatio = 1;

  @state() private _minutesDifference = 24 * 60;

  @state() private _hiddenDatasets = new Set<string>();

  private _modifierPressed = false;

  private _isTouchDevice = "ontouchstart" in window;

  // @ts-ignore
  private _resizeController = new ResizeController(this, {
    callback: () => this.chart?.resize(),
  });

  private _loading = false;

  private _reducedMotion = false;

  private _listeners: (() => void)[] = [];

  public disconnectedCallback() {
    super.disconnectedCallback();
    while (this._listeners.length) {
      this._listeners.pop()!();
    }
    this.chart?.dispose();
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
          this.chart?.setOption({ animation: !this._reducedMotion });
        }
      })
    );

    // Add keyboard event listeners
    const handleKeyDown = (ev: KeyboardEvent) => {
      if ((isMac && ev.key === "Meta") || (!isMac && ev.key === "Control")) {
        this._modifierPressed = true;
        if (!this.options?.dataZoom) {
          this.chart?.setOption({ dataZoom: this._getDataZoomConfig() });
        }
      }
    };

    const handleKeyUp = (ev: KeyboardEvent) => {
      if ((isMac && ev.key === "Meta") || (!isMac && ev.key === "Control")) {
        this._modifierPressed = false;
        if (!this.options?.dataZoom) {
          this.chart?.setOption({ dataZoom: this._getDataZoomConfig() });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    this._listeners.push(
      () => window.removeEventListener("keydown", handleKeyDown),
      () => window.removeEventListener("keyup", handleKeyUp)
    );
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
    const chartUpdateParams: SetOptionOpts = { lazyUpdate: true };
    if (changedProps.has("data")) {
      chartOptions.series = this.data;
      chartUpdateParams.replaceMerge = ["series"];
    }
    if (changedProps.has("options")) {
      chartOptions = { ...chartOptions, ...this._createOptions() };
    } else if (this._isTouchDevice && changedProps.has("_isZoomed")) {
      chartOptions.dataZoom = this._getDataZoomConfig();
    }
    if (Object.keys(chartOptions).length > 0) {
      this.chart.setOption(chartOptions, chartUpdateParams);
    }
  }

  protected render() {
    return html`
      <div
        class="chart-container"
        style=${styleMap({
          height: this.height ?? `${this._getDefaultHeight()}px`,
        })}
      >
        ${this._renderLegend()}
        <div class="chart"></div>
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
      </div>
    `;
  }

  private _renderLegend() {
    if (!this.options?.legend || !this.data) {
      return nothing;
    }
    const legend = ensureArray(this.options.legend)[0] as LegendComponentOption;
    if (!legend.show) {
      return nothing;
    }
    const datasets = ensureArray(this.data);
    const items = (legend.data ||
      datasets
        .filter((d) => (d.data as any[])?.length && (d.id || d.name))
        .map((d) => d.name ?? d.id) ||
      []) as string[];
    return html`<ha-faded
      class="chart-legend"
      faded-height="40"
      @content-shown=${this._handleContentShown}
    >
      <ul>
        ${items.map((item: string) => {
          const dataset = datasets.find(
            (d) => d.id === item || d.name === item
          );
          return html`<li
            .name=${item}
            @click=${this._legendClick}
            class=${classMap({
              hidden: this._hiddenDatasets.has(item),
            })}
            .title=${item}
          >
            <div
              class="bullet"
              style=${styleMap({
                backgroundColor: dataset?.color as string,
                borderColor: dataset?.itemStyle?.borderColor as string,
              })}
            ></div>
            <div class="label">${item}</div>
          </li>`;
        })}
      </ul>
    </ha-faded>`;
  }

  private _handleContentShown() {
    setTimeout(() => {
      this.chart?.resize();
    });
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
      this.chart.on("mousemove", (e: ECElementEvent) => {
        if (e.componentType === "series" && e.componentSubType === "custom") {
          // custom series do not support cursor style so we need to set it manually
          this.chart?.getZr()?.setCursorStyle("default");
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
    const xAxis = (this.options?.xAxis?.[0] ??
      this.options?.xAxis) as XAXisOption;
    const yAxis = (this.options?.yAxis?.[0] ??
      this.options?.yAxis) as YAXisOption;
    if (xAxis.type === "value" && yAxis.type === "category") {
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
          axisLine: {
            show: false,
          },
          splitLine: {
            show: true,
          },
          ...axis,
          axisLabel: {
            formatter: this._formatTimeLabel,
            rich: {
              bold: {
                fontWeight: "bold",
              },
            },
            hideOverlap: true,
            ...axis.axisLabel,
          },
          minInterval,
        } as XAXisOption;
      });
    }
    const options = {
      animation: !this._reducedMotion,
      darkMode: this._themes.darkMode ?? false,
      aria: {
        show: true,
      },
      dataZoom: this._getDataZoomConfig(),
      ...this.options,
      legend: {
        show: false,
      },
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
        textStyle: {
          color: style.getPropertyValue("--primary-text-color"),
        },
        subtextStyle: {
          color: style.getPropertyValue("--secondary-text-color"),
        },
      },
      line: {
        lineStyle: {
          width: 1.5,
        },
        symbolSize: 1,
        symbol: "circle",
        smooth: false,
      },
      bar: {
        itemStyle: {
          barBorderWidth: 1.5,
        },
      },
      categoryAxis: {
        axisLine: {
          show: false,
        },
        axisTick: {
          show: false,
        },
        axisLabel: {
          show: true,
          color: style.getPropertyValue("--primary-text-color"),
        },
        splitLine: {
          show: false,
          lineStyle: {
            color: style.getPropertyValue("--divider-color"),
          },
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
          lineStyle: {
            color: style.getPropertyValue("--divider-color"),
          },
        },
        axisTick: {
          show: true,
          lineStyle: {
            color: style.getPropertyValue("--divider-color"),
          },
        },
        axisLabel: {
          show: true,
          color: style.getPropertyValue("--primary-text-color"),
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: style.getPropertyValue("--divider-color"),
          },
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
          lineStyle: {
            color: style.getPropertyValue("--divider-color"),
          },
        },
        axisTick: {
          show: true,
          lineStyle: {
            color: style.getPropertyValue("--divider-color"),
          },
        },
        axisLabel: {
          show: true,
          color: style.getPropertyValue("--primary-text-color"),
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: style.getPropertyValue("--divider-color"),
          },
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
          lineStyle: {
            color: style.getPropertyValue("--divider-color"),
          },
        },
        axisTick: {
          show: true,
          lineStyle: {
            color: style.getPropertyValue("--divider-color"),
          },
        },
        axisLabel: {
          show: true,
          color: style.getPropertyValue("--primary-text-color"),
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: style.getPropertyValue("--divider-color"),
          },
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
        textStyle: {
          color: style.getPropertyValue("--primary-text-color"),
        },
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
          lineStyle: {
            color: style.getPropertyValue("--divider-color"),
          },
          crossStyle: {
            color: style.getPropertyValue("--divider-color"),
          },
        },
      },
      timeline: {},
    };
  }

  private _getSeries() {
    if (!Array.isArray(this.data)) {
      return this.data;
    }
    return this.data.filter(
      (d) => !this._hiddenDatasets.has(String(d.name ?? d.id))
    );
  }

  private _getDefaultHeight() {
    return Math.max(this.clientWidth / 2, 200);
  }

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
  }

  static styles = css`
    :host {
      display: block;
      position: relative;
      letter-spacing: normal;
    }
    .chart-container {
      display: flex;
      flex-direction: column;
      position: relative;
      max-height: var(--chart-max-height, 350px);
    }
    .chart {
      flex: 1;
      width: 100%;
    }
    .zoom-reset {
      position: absolute;
      top: 16px;
      right: 4px;
      background: var(--card-background-color);
      border-radius: 4px;
      --mdc-icon-button-size: 32px;
      color: var(--primary-color);
      border: 1px solid var(--divider-color);
    }
    .chart-legend {
      text-align: center;
      margin: 12px 0 0;
    }
    .chart-legend ul {
      margin: 0;
    }
    .chart-legend li {
      cursor: pointer;
      display: inline-grid;
      grid-auto-flow: column;
      padding: 0 8px;
      box-sizing: border-box;
      align-items: center;
      color: var(--secondary-text-color);
      max-width: 250px;
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
    }
    .chart-legend .hidden {
      text-decoration: line-through;
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
      display: inline-block;
      height: 16px;
      margin-right: 6px;
      width: 16px;
      flex-shrink: 0;
      box-sizing: border-box;
      margin-inline-end: 6px;
      margin-inline-start: initial;
      direction: var(--direction);
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
