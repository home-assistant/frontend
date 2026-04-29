import { ResizeController } from "@lit-labs/observers/resize-controller";
import { consume } from "@lit/context";
import {
  mdiCheckCircle,
  mdiChevronDown,
  mdiChevronUp,
  mdiCircleOutline,
  mdiRestart,
} from "@mdi/js";
import { differenceInMinutes } from "date-fns";
import type { DataZoomComponentOption } from "echarts/components";
import type { EChartsType } from "echarts/core";
import type {
  ECElementEvent,
  LegendComponentOption,
  LineSeriesOption,
  XAXisOption,
  YAXisOption,
} from "echarts/types/dist/shared";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { ensureArray } from "../../common/array/ensure-array";
import { getAllGraphColors } from "../../common/color/colors";
import { transform } from "../../common/decorators/transform";
import type { HASSDomEvent } from "../../common/dom/fire_event";
import { fireEvent } from "../../common/dom/fire_event";
import { listenMediaQuery } from "../../common/dom/media_query";
import { afterNextRender } from "../../common/util/render-status";
import { filterXSS } from "../../common/util/xss";
import { uiContext } from "../../data/context";
import type { Themes } from "../../data/ws-themes";
import type { ECOption } from "../../resources/echarts/echarts";
import type { HomeAssistant, HomeAssistantUI } from "../../types";
import { isMac } from "../../util/is_mac";
import "../chips/ha-assist-chip";
import "../ha-icon-button";
import { formatTimeLabel } from "./axis-label";
import { downSampleLineData } from "./down-sample";

export const MIN_TIME_BETWEEN_UPDATES = 60 * 5 * 1000;
const LEGEND_OVERFLOW_LIMIT = 10;
const LEGEND_OVERFLOW_LIMIT_MOBILE = 6;
const DOUBLE_TAP_TIME = 300;

export type CustomLegendOption = ECOption["legend"] & {
  type: "custom";
  data?: {
    id?: string;
    secondaryIds?: string[]; // Other dataset IDs that should be controlled by this legend item.
    name: string;
    value?: string; // Current value to display next to the name in the legend.
    itemStyle?: Record<string, any>;
    // If true, label click does not fire `legend-label-click` even when the
    // chart has `clickLabelForMoreInfo`; falls back to toggle. Used for items
    // without a corresponding entity (e.g. external statistics).
    noLabelClick?: boolean;
  }[];
};

@customElement("ha-chart-base")
export class HaChartBase extends LitElement {
  public chart?: EChartsType;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public data: ECOption["series"] = [];

  @property({ attribute: false }) public options?: ECOption;

  @property({ type: String }) public height?: string;

  @property({ attribute: "expand-legend", type: Boolean })
  public expandLegend?: boolean;

  @property({ attribute: "small-controls", type: Boolean })
  public smallControls?: boolean;

  @property({ attribute: "hide-reset-button", type: Boolean })
  public hideResetButton?: boolean;

  // extraComponents is not reactive and should not trigger updates
  public extraComponents?: any[];

  @state()
  @consume({ context: uiContext, subscribe: true })
  @transform<HomeAssistantUI, Themes>({
    transformer: ({ themes }) => themes,
  })
  private _themes!: Themes;

  @property({ attribute: "click-label-for-more-info", type: Boolean })
  public clickLabelForMoreInfo = false;

  @state() private _isZoomed = false;

  @state() private _zoomRatio = 1;

  @state() private _minutesDifference = 24 * 60;

  @state() private _hiddenDatasets = new Set<string>();

  private _modifierPressed = false;

  private _isTouchDevice = "ontouchstart" in window;

  private _lastTapTime?: number;

  private _longPressTimer?: ReturnType<typeof setTimeout>;

  private _longPressTriggered = false;

  private _shouldResizeChart = false;

  private _resizeAnimationDuration?: number;

  private _suspendResize = false;

  private _layoutTransitionActive = false;

  // @ts-ignore
  private _resizeController = new ResizeController(this, {
    callback: () => {
      if (this.chart) {
        if (this._suspendResize) {
          this._shouldResizeChart = true;
          return;
        }
        if (!this.chart.getZr().animation.isFinished()) {
          this._shouldResizeChart = true;
        } else {
          this.chart.resize();
        }
      }
    },
  });

  private _loading = false;

  private _reducedMotion = false;

  private _listeners: (() => void)[] = [];

  private _originalZrFlush?: () => void;

  private _pendingSetup = false;

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._legendPointerCancel();
    this._pendingSetup = false;
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
      this._pendingSetup = true;
      afterNextRender(() => {
        if (this.isConnected && this._pendingSetup) {
          this._pendingSetup = false;
          this._setupChart();
        }
      });
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
          this._updateSankeyRoam();
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
          this._updateSankeyRoam();
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

    const handleLayoutTransition: EventListener = (ev) => {
      const event = ev as HASSDomEvent<HASSDomEvents["hass-layout-transition"]>;
      this._layoutTransitionActive = Boolean(event.detail?.active);
      this.toggleAttribute(
        "layout-transition-active",
        this._layoutTransitionActive
      );
      this._suspendResize = this._layoutTransitionActive;
      if (!this._suspendResize) {
        this._resizeChartIfNeeded();
      }
    };
    window.addEventListener("hass-layout-transition", handleLayoutTransition);
    this._listeners.push(() =>
      window.removeEventListener(
        "hass-layout-transition",
        handleLayoutTransition
      )
    );
  }

  protected firstUpdated() {
    if (this.isConnected) {
      this._setupChart();
    }
  }

  public willUpdate(changedProps: PropertyValues): void {
    if (!this.chart) {
      return;
    }
    if (changedProps.has("_themes") && this.hasUpdated) {
      this._setupChart();
      return;
    }
    let chartOptions: ECOption = {};
    if (changedProps.has("options")) {
      // Separate 'if' from below since this must updated before _getSeries()
      this._updateHiddenStatsFromOptions(this.options);
    }
    if (changedProps.has("data") || changedProps.has("_hiddenDatasets")) {
      chartOptions.series = this._getSeries();
    }
    if (changedProps.has("options")) {
      chartOptions = { ...chartOptions, ...this._createOptions() };
      if (
        this._compareCustomLegendOptions(
          changedProps.get("options"),
          this.options
        )
      ) {
        // custom legend changes may require a resize to layout properly
        this._shouldResizeChart = true;
        this._resizeAnimationDuration = 250;
      }
    } else if (this._isTouchDevice && changedProps.has("_isZoomed")) {
      chartOptions.dataZoom = this._getDataZoomConfig();
    }
    if (Object.keys(chartOptions).length > 0) {
      this._setChartOptions(chartOptions);
      if (chartOptions.series) {
        this._updateSankeyRoam();
      }
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
        <div class="top-controls ${classMap({ small: this.smallControls })}">
          <slot name="search"></slot>
          <div
            class="chart-controls ${classMap({ small: this.smallControls })}"
          >
            ${this._isZoomed && !this.hideResetButton
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
      </div>
    `;
  }

  private _getLegendItems() {
    if (!this.options?.legend || !this.data) {
      return undefined;
    }
    const legend = ensureArray(this.options.legend).find(
      (l) => l.show && l.type === "custom"
    ) as CustomLegendOption | undefined;
    if (!legend) {
      return undefined;
    }
    const datasets = ensureArray(this.data);
    return (
      legend.data ||
      datasets
        .filter((d) => (d.data as any[])?.length && (d.id || d.name))
        .map((d) => ({ id: d.id, name: d.name }))
    );
  }

  private _renderLegend() {
    const items = this._getLegendItems();
    if (!items) {
      return nothing;
    }
    const datasets = ensureArray(this.data!);

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
        ${items.map((item, index) => {
          if (!this.expandLegend && index >= overflowLimit) {
            return nothing;
          }
          let itemStyle: Record<string, any> = {};
          let id = "";
          let value = "";
          let noLabelClick = false;
          const name = typeof item === "string" ? item : (item.name ?? "");
          if (typeof item === "string") {
            id = item;
          } else {
            id = item.id ?? name;
            value = item.value ?? "";
            itemStyle = item.itemStyle ?? {};
            noLabelClick = item.noLabelClick ?? false;
          }
          const labelClickable = this.clickLabelForMoreInfo && !noLabelClick;
          const dataset =
            datasets.find((d) => d.id === id) ??
            datasets.find((d) => d.name === id);
          itemStyle = {
            color: dataset?.color as string,
            ...(dataset?.itemStyle as { borderColor?: string }),
            ...itemStyle,
          };
          const color = itemStyle?.color as string;
          return html`<li
            .id=${id}
            @pointerdown=${this._legendPointerDown}
            @pointerup=${this._legendPointerCancel}
            @pointerleave=${this._legendPointerCancel}
            @pointercancel=${this._legendPointerCancel}
            @contextmenu=${this._legendContextMenu}
            class=${classMap({ hidden: this._hiddenDatasets.has(id) })}
          >
            <button
              type="button"
              class="legend-toggle"
              data-id=${id}
              aria-pressed=${!this._hiddenDatasets.has(id)}
              .title=${this.hass.localize(
                "ui.components.history_charts.toggle_visibility"
              )}
              @click=${this._toggleDataset}
            >
              <ha-svg-icon
                .path=${this._hiddenDatasets.has(id)
                  ? mdiCircleOutline
                  : mdiCheckCircle}
                style=${styleMap({
                  color: this._hiddenDatasets.has(id) ? undefined : color,
                })}
              ></ha-svg-icon>
            </button>
            <button
              type="button"
              class=${classMap({ label: true, clickable: labelClickable })}
              data-id=${id}
              .title=${name}
              @click=${this._labelClick}
            >
              ${name}
            </button>
            ${value ? html`<div class="value">${value}</div>` : nothing}
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
      const echarts = (await import("../../resources/echarts/echarts")).default;

      if (this.extraComponents?.length) {
        echarts.use(this.extraComponents);
      }

      const style = getComputedStyle(this);
      echarts.registerTheme("custom", this._createTheme(style));

      this.chart = echarts.init(container, "custom");
      this.chart.on("datazoom", (e: any) => {
        this._handleDataZoomEvent(e);
      });
      this.chart.on("click", (e: ECElementEvent) => {
        fireEvent(this, "chart-click", e);
      });
      this.chart.on("sankeyroam", () => {
        const option = this.chart!.getOption();
        const series = option.series as any[];
        const sankeySeries = series?.find((s: any) => s.type === "sankey");
        const zoomed = sankeySeries.zoom !== 1;
        this._isZoomed = zoomed;
        if (!zoomed) {
          // Reset center when fully zoomed out
          this.chart!.setOption({
            series: [{ id: sankeySeries.id, center: null }],
          });
        }
        fireEvent(this, "chart-sankeyroam", { zoom: sankeySeries.zoom });
        // Clear cached emphasis states so labels don't revert to pre-zoom sizes
        this.chart!.dispatchAction({ type: "downplay" });
      });

      if (!this.options?.dataZoom) {
        this.chart.getZr().on("dblclick", this._handleClickZoom);
      }
      this.chart.on("finished", this._handleChartRenderFinished);
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
        // show axis pointer handle on touch devices
        let dragJustEnded = false;
        let lastTipX: number | undefined;
        let lastTipY: number | undefined;
        this.chart.on("showTip", (e: any) => {
          lastTipX = e.x;
          lastTipY = e.y;
          this.chart?.setOption({
            xAxis: ensureArray(
              (this.chart?.getOption().xAxis as any) ?? []
            ).map((axis: XAXisOption) =>
              axis.show
                ? {
                    ...axis,
                    axisPointer: {
                      ...axis.axisPointer,
                      status: "show",
                      handle: {
                        color: style.getPropertyValue("--primary-color"),
                        margin: 0,
                        size: 20,
                        ...axis.axisPointer?.handle,
                        show: true,
                      },
                      label: { show: false },
                    },
                  }
                : axis
            ),
          });
        });
        this.chart.on("hideTip", (e: any) => {
          // the drag end event doesn't have a `from` property
          if (e.from) {
            if (dragJustEnded) {
              // hideTip is fired twice when the drag ends, so we need to ignore the second one
              dragJustEnded = false;
              return;
            }
            this.chart?.setOption({
              xAxis: ensureArray(
                (this.chart?.getOption().xAxis as any) ?? []
              ).map((axis: XAXisOption) =>
                axis.show
                  ? {
                      ...axis,
                      axisPointer: {
                        ...axis.axisPointer,
                        handle: {
                          ...axis.axisPointer?.handle,
                          show: false,
                        },
                        status: "hide",
                      },
                    }
                  : axis
              ),
            });
            this.chart?.dispatchAction({
              type: "downplay",
            });
          } else if (lastTipX != null && lastTipY != null) {
            // echarts hides the tip as soon as the drag ends, so we need to show it again
            dragJustEnded = true;
            this.chart?.dispatchAction({
              type: "showTip",
              x: lastTipX,
              y: lastTipY,
            });
          }
        });
      }

      this._updateHiddenStatsFromOptions(this.options);

      this.chart.setOption({
        ...this._createOptions(),
        series: this._getSeries(),
      });
      this._updateSankeyRoam();
    } finally {
      this._loading = false;
    }
  }

  // Return an array of all IDs associated with the legend item of the primaryId
  private _getAllIdsFromLegend(
    options: ECOption | undefined,
    primaryId: string
  ): string[] {
    if (!options) return [primaryId];
    const legend = ensureArray(this.options?.legend || [])[0] as
      | LegendComponentOption
      | undefined;

    let customLegendItem;
    if (legend?.type === "custom") {
      customLegendItem = (legend as CustomLegendOption).data?.find(
        (li) => typeof li === "object" && li.id === primaryId
      );
    }

    return [primaryId, ...(customLegendItem?.secondaryIds || [])];
  }

  // Parses the options structure and adds all ids of unselected legend items to hiddenDatasets.
  // No known need to remove items at this time.
  private _updateHiddenStatsFromOptions(options: ECOption | undefined) {
    if (!options) return;
    const legend = ensureArray(this.options?.legend || [])[0] as
      | LegendComponentOption
      | undefined;
    Object.entries(legend?.selected || {}).forEach(([stat, selected]) => {
      if (selected === false) {
        this._getAllIdsFromLegend(options, stat).forEach((id) =>
          this._hiddenDatasets.add(id)
        );
      }
    });
    this.requestUpdate("_hiddenDatasets");
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
      filterMode: this._getDataZoomFilterMode() as any,
      xAxisIndex: 0,
      moveOnMouseMove: !this._isTouchDevice || this._isZoomed,
      preventDefaultMouseMove: !this._isTouchDevice || this._isZoomed,
      zoomLock: !this._isTouchDevice && !this._modifierPressed,
    };
  }

  // "boundaryFilter" is a custom mode added via axis-proxy-patch.ts.
  // It rescales the Y-axis to the visible data while keeping one point
  // just outside each boundary to avoid line gaps at the zoom edges.
  // Use "filter" for bar charts since boundaryFilter causes rendering issues.
  // Use "weakFilter" for other types (e.g. custom/timeline) so bars
  // spanning the visible range boundary are kept.
  private _getDataZoomFilterMode(): string {
    const series = ensureArray(this.data);
    if (series.every((s) => s.type === "line")) {
      return "boundaryFilter";
    }
    if (series.some((s) => s.type === "bar")) {
      return "filter";
    }
    return "weakFilter";
  }

  private _createOptions(): ECOption {
    let xAxis = this.options?.xAxis;
    if (xAxis) {
      xAxis = Array.isArray(xAxis) ? xAxis : [xAxis];
      xAxis = xAxis.map((axis: XAXisOption) => {
        if (axis.type !== "time" || axis.show === false) {
          return axis;
        }
        if (axis.min) {
          this._minutesDifference = differenceInMinutes(
            (axis.max as Date) || new Date(),
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
          minInterval: axis.minInterval ?? minInterval,
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
      animationDuration: 500,
      darkMode: this._themes.darkMode ?? false,
      aria: { show: true },
      dataZoom: this._getDataZoomConfig(),
      toolbox: {
        top: Number.MAX_SAFE_INTEGER,
        left: Number.MAX_SAFE_INTEGER,
        feature: {
          dataZoom: {
            show: true,
            yAxisIndex: false,
            filterMode: "none",
            showTitle: false,
          },
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

  private _createTheme(style: CSSStyleDeclaration) {
    const textBorderColor =
      style.getPropertyValue("--ha-card-background") ||
      style.getPropertyValue("--card-background-color");
    const textBorderWidth = 2;
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
      graph: {
        label: {
          color: style.getPropertyValue("--primary-text-color"),
          textBorderColor,
          textBorderWidth,
        },
      },
      pie: {
        label: {
          color: style.getPropertyValue("--primary-text-color"),
          textBorderColor,
          textBorderWidth,
        },
      },
      sankey: {
        label: {
          color: style.getPropertyValue("--primary-text-color"),
          textBorderColor,
          textBorderWidth,
        },
      },
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
    const xAxis = (this.options?.xAxis?.[0] ?? this.options?.xAxis) as
      | XAXisOption
      | undefined;
    const yAxis = (this.options?.yAxis?.[0] ?? this.options?.yAxis) as
      | YAXisOption
      | undefined;
    const series = ensureArray(this.data).map((s) => {
      const data = this._hiddenDatasets.has(String(s.id ?? s.name))
        ? undefined
        : s.data;
      if (data && s.type === "line") {
        if (yAxis?.type === "log") {
          // set <=0 values to null so they render as gaps on a log graph
          return {
            ...s,
            data: (data as LineSeriesOption["data"])!.map((v) =>
              Array.isArray(v)
                ? [
                    v[0],
                    typeof v[1] !== "number" || v[1] > 0 ? v[1] : null,
                    ...v.slice(2),
                  ]
                : v
            ),
          };
        }
        if (s.sampling === "minmax") {
          const minX = xAxis?.min
            ? xAxis.min instanceof Date
              ? xAxis.min.getTime()
              : typeof xAxis.min === "number"
                ? xAxis.min
                : undefined
            : undefined;
          const maxX = xAxis?.max
            ? xAxis.max instanceof Date
              ? xAxis.max.getTime()
              : typeof xAxis.max === "number"
                ? xAxis.max
                : undefined
            : undefined;
          return {
            ...s,
            sampling: undefined,
            data: downSampleLineData(
              data as LineSeriesOption["data"],
              this.clientWidth * window.devicePixelRatio,
              minX,
              maxX
            ),
          };
        }
      }
      const name = filterXSS(String(s.name ?? s.id ?? ""));
      return { ...s, name, data };
    });
    return series as ECOption["series"];
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
    // Handle sankey chart double-click zoom
    const option = this.chart.getOption();
    const allSeries = option.series as any[];
    const sankeySeries = allSeries?.filter((s: any) => s.type === "sankey");
    if (sankeySeries?.length) {
      if (this._isZoomed) {
        this._handleZoomReset();
      } else {
        this.chart.setOption({
          series: sankeySeries.map((s: any) => ({
            id: s.id,
            zoom: 2,
          })),
        });
        this._isZoomed = true;
      }
      if (sankeySeries.length === allSeries?.length) {
        return;
      }
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

  public zoom(start: number, end: number, silent = false) {
    this.chart?.dispatchAction({
      type: "dataZoom",
      start,
      end,
      silent,
    });
  }

  private _handleZoomReset() {
    this.chart?.dispatchAction({ type: "dataZoom", start: 0, end: 100 });
    // Reset sankey roam zoom
    const option = this.chart?.getOption();
    const sankeySeries = (option?.series as any[])?.filter(
      (s: any) => s.type === "sankey"
    );
    if (sankeySeries?.length) {
      this.chart?.setOption({
        series: sankeySeries.map((s: any) => ({
          id: s.id,
          zoom: 1,
          center: null,
        })),
      });
      this._isZoomed = false;
      fireEvent(this, "chart-sankeyroam", { zoom: 1 });
    }
  }

  private _updateSankeyRoam() {
    const option = this.chart?.getOption();
    const sankeySeries = (option?.series as any[])?.filter(
      (s: any) => s.type === "sankey"
    );
    if (sankeySeries?.length) {
      this.chart?.setOption({
        series: sankeySeries.map((s: any) => ({
          id: s.id,
          roam: this._modifierPressed || this._isTouchDevice ? true : "move",
        })),
      });
    }
  }

  private _handleDataZoomEvent(e: any) {
    const zoomData = e.batch?.[0] ?? e;
    let start = typeof zoomData.start === "number" ? zoomData.start : 0;
    let end = typeof zoomData.end === "number" ? zoomData.end : 100;

    if (
      start === 0 &&
      end === 100 &&
      zoomData.startValue !== undefined &&
      zoomData.endValue !== undefined
    ) {
      const option = this.chart!.getOption();
      const xAxis = option.xAxis?.[0] ?? option.xAxis;

      if (xAxis?.min && xAxis?.max) {
        const axisMin = new Date(xAxis.min).getTime();
        const axisMax = new Date(xAxis.max).getTime();
        const axisRange = axisMax - axisMin;

        start = Math.max(
          0,
          Math.min(100, ((zoomData.startValue - axisMin) / axisRange) * 100)
        );
        end = Math.max(
          0,
          Math.min(100, ((zoomData.endValue - axisMin) / axisRange) * 100)
        );
      }
    }

    this._isZoomed = start !== 0 || end !== 100;
    this._zoomRatio = (end - start) / 100;
    if (this._isTouchDevice) {
      this.chart?.dispatchAction({
        type: "hideTip",
        from: "datazoom",
      });
    }
    fireEvent(this, "chart-zoom", { start, end });
  }

  // Long-press to solo on touch/pen devices (500ms, consistent with action-handler-directive)
  private _legendPointerDown(ev: PointerEvent) {
    // Mouse uses Ctrl/Cmd+click instead
    if (ev.pointerType === "mouse") {
      return;
    }
    const id = (ev.currentTarget as HTMLElement)?.id;
    if (!id) {
      return;
    }
    this._longPressTriggered = false;
    this._longPressTimer = setTimeout(() => {
      this._longPressTriggered = true;
      this._longPressTimer = undefined;
      this._soloLegend(id);
    }, 500);
  }

  private _legendPointerCancel() {
    if (this._longPressTimer) {
      clearTimeout(this._longPressTimer);
      this._longPressTimer = undefined;
    }
  }

  private _legendContextMenu(ev: Event) {
    if (this._longPressTimer || this._longPressTriggered) {
      ev.preventDefault();
    }
  }

  private _toggleDataset(ev: MouseEvent) {
    ev.stopPropagation();
    if (!this.chart) {
      return;
    }
    if (this._longPressTriggered) {
      this._longPressTriggered = false;
      return;
    }
    const id = (ev.currentTarget as HTMLElement).dataset.id;
    if (!id) {
      return;
    }
    // Cmd+click on Mac (Ctrl+click is right-click there), Ctrl+click elsewhere
    const soloModifier = isMac ? ev.metaKey : ev.ctrlKey;
    if (soloModifier) {
      this._soloLegend(id);
      return;
    }
    this._handleDatasetToggle(id);
  }

  private _labelClick(ev: MouseEvent) {
    ev.stopPropagation();
    if (!this.chart) {
      return;
    }
    if (this._longPressTriggered) {
      this._longPressTriggered = false;
      return;
    }
    const target = ev.currentTarget as HTMLElement;
    const id = target.dataset.id;
    if (!id) {
      return;
    }
    const soloModifier = isMac ? ev.metaKey : ev.ctrlKey;
    if (soloModifier) {
      this._soloLegend(id);
      return;
    }
    if (target.classList.contains("clickable")) {
      fireEvent(this, "legend-label-click", { id });
    } else {
      this._handleDatasetToggle(id);
    }
  }

  private _handleDatasetToggle(id: string) {
    if (this._hiddenDatasets.has(id)) {
      this._getAllIdsFromLegend(this.options, id).forEach((i) =>
        this._hiddenDatasets.delete(i)
      );
      fireEvent(this, "dataset-unhidden", { id });
    } else {
      this._getAllIdsFromLegend(this.options, id).forEach((i) =>
        this._hiddenDatasets.add(i)
      );
      fireEvent(this, "dataset-hidden", { id });
    }
    this.requestUpdate("_hiddenDatasets");
  }

  private _soloLegend(id: string) {
    const allIds = this._getAllLegendIds();
    const clickedIds = this._getAllIdsFromLegend(this.options, id);
    const otherIds = allIds.filter((i) => !clickedIds.includes(i));

    const clickedIsOnlyVisible =
      clickedIds.every((i) => !this._hiddenDatasets.has(i)) &&
      otherIds.every((i) => this._hiddenDatasets.has(i));

    if (clickedIsOnlyVisible) {
      // Already solo'd on this item — restore all series to visible
      for (const hiddenId of [...this._hiddenDatasets]) {
        this._hiddenDatasets.delete(hiddenId);
        fireEvent(this, "dataset-unhidden", { id: hiddenId });
      }
    } else {
      // Solo: hide every other series, unhide clicked if it was hidden
      for (const otherId of otherIds) {
        if (!this._hiddenDatasets.has(otherId)) {
          this._hiddenDatasets.add(otherId);
          fireEvent(this, "dataset-hidden", { id: otherId });
        }
      }
      for (const clickedId of clickedIds) {
        if (this._hiddenDatasets.has(clickedId)) {
          this._hiddenDatasets.delete(clickedId);
          fireEvent(this, "dataset-unhidden", { id: clickedId });
        }
      }
    }
    this.requestUpdate("_hiddenDatasets");
  }

  private _getAllLegendIds(): string[] {
    const items = this._getLegendItems();
    if (!items) {
      return [];
    }
    const allIds = new Set<string>();
    for (const item of items) {
      const primaryId =
        typeof item === "string"
          ? item
          : ((item.id as string) ?? (item.name as string) ?? "");
      for (const expandedId of this._getAllIdsFromLegend(
        this.options,
        primaryId
      )) {
        allIds.add(expandedId);
      }
    }
    return [...allIds];
  }

  private _toggleExpandedLegend() {
    this.expandLegend = !this.expandLegend;
    setTimeout(() => {
      this.chart?.resize();
    });
  }

  private _handleChartRenderFinished = () => {
    this._resizeChartIfNeeded();
  };

  private _resizeChartIfNeeded() {
    if (!this.chart || !this._shouldResizeChart) {
      return;
    }
    if (this._suspendResize) {
      return;
    }
    if (!this.chart.getZr().animation.isFinished()) {
      return;
    }
    this.chart.resize({
      animation:
        this._reducedMotion || typeof this._resizeAnimationDuration !== "number"
          ? undefined
          : { duration: this._resizeAnimationDuration },
    });
    this._shouldResizeChart = false;
    this._resizeAnimationDuration = undefined;
  }

  private _compareCustomLegendOptions(
    oldOptions: ECOption | undefined,
    newOptions: ECOption | undefined
  ): boolean {
    const oldLegends = ensureArray(
      oldOptions?.legend || []
    ) as LegendComponentOption[];
    const newLegends = ensureArray(
      newOptions?.legend || []
    ) as LegendComponentOption[];
    return (
      oldLegends.some((l) => l.show && l.type === "custom") !==
      newLegends.some((l) => l.show && l.type === "custom")
    );
  }

  static styles = css`
    :host {
      display: block;
      position: relative;
      letter-spacing: normal;
      overflow: visible;
    }
    :host([layout-transition-active]),
    :host([layout-transition-active]) .container,
    :host([layout-transition-active]) .chart-container {
      overflow: hidden;
    }
    .container {
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: visible;
    }
    .container.has-height {
      max-height: var(--chart-max-height, 350px);
    }
    .chart-container {
      width: 100%;
      max-height: var(--chart-max-height, 350px);
      overflow: visible;
    }
    .has-height .chart-container {
      flex: 1;
    }
    .chart {
      height: 100%;
      width: 100%;
    }
    .top-controls {
      position: absolute;
      top: var(--ha-space-4);
      inset-inline-start: var(--ha-space-4);
      inset-inline-end: var(--ha-space-1);
      display: flex;
      align-items: flex-start;
      gap: var(--ha-space-2);
      z-index: 1;
      pointer-events: none;
    }
    ::slotted([slot="search"]) {
      flex: 1 1 250px;
      min-width: 0;
      max-width: 250px;
      pointer-events: auto;
    }
    .chart-controls {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-1);
      margin-inline-start: auto;
      flex-shrink: 0;
      pointer-events: auto;
    }
    .top-controls.small {
      top: 0;
    }
    .chart-controls.small {
      flex-direction: row;
    }
    .chart-controls ha-icon-button,
    .chart-controls ::slotted(ha-icon-button) {
      background: var(--card-background-color);
      border-radius: var(--ha-border-radius-sm);
      --ha-icon-button-size: 32px;
      color: var(--primary-color);
      border: 1px solid var(--divider-color);
    }
    .chart-controls.small ha-icon-button,
    .chart-controls.small ::slotted(ha-icon-button) {
      --ha-icon-button-size: 22px;
      --mdc-icon-size: 16px;
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
      gap: var(--ha-space-2);
    }
    .chart-legend li {
      height: 24px;
      display: inline-flex;
      align-items: center;
      padding: 0 2px;
      box-sizing: border-box;
      overflow: hidden;
    }
    .chart-legend.multiple-items li {
      max-width: 220px;
    }
    .chart-legend.multiple-items li:has(.value) {
      max-width: 300px;
    }
    .chart-legend .hidden {
      color: var(--secondary-text-color);
    }
    .chart-legend .label {
      background: none;
      border: none;
      padding: 0;
      margin: 0;
      font: inherit;
      color: inherit;
      cursor: pointer;
      text-align: start;
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;
    }
    @media (hover: hover) {
      .chart-legend .label.clickable:hover {
        text-decoration: underline;
      }
      .chart-legend .legend-toggle:hover {
        opacity: 0.5;
      }
    }
    .chart-legend .value {
      color: var(--secondary-text-color);
      margin-inline-start: var(--ha-space-1);
      flex-shrink: 0;
      white-space: nowrap;
    }
    .chart-legend .legend-toggle {
      background: none;
      border: none;
      color: inherit;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      padding: 4px;
      margin: -4px;
      margin-inline-end: 0;
    }
    .chart-legend .legend-toggle:focus-visible,
    .chart-legend .label:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
      border-radius: var(--ha-border-radius-small, 4px);
    }
    .chart-legend .legend-toggle ha-svg-icon {
      --mdc-icon-size: 18px;
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
    "dataset-hidden": { id: string };
    "dataset-unhidden": { id: string };
    "chart-click": ECElementEvent;
    "legend-label-click": { id: string };
    "chart-zoom": {
      start: number;
      end: number;
    };
    "chart-sankeyroam": { zoom: number };
  }
}
