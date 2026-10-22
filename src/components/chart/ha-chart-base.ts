import { ResizeController } from "@lit-labs/observers/resize-controller";
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
  TooltipOption,
  XAXisOption,
  YAXisOption,
} from "echarts/types/dist/shared";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import {
  customElement,
  eventOptions,
  property,
  query,
  state,
} from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { styleMap } from "lit/directives/style-map";
import type { HassConfig } from "home-assistant-js-websocket";
import { consume } from "../../common/decorators/consume";
import { ensureArray } from "../../common/array/ensure-array";
import { getAllGraphColors } from "../../common/color/colors";
import { transform } from "../../common/decorators/transform";
import type {
  HASSDomCurrentTargetEvent,
  HASSDomEvent,
} from "../../common/dom/fire_event";
import { fireEvent } from "../../common/dom/fire_event";
import { listenMediaQuery } from "../../common/dom/media_query";
import { afterNextRender } from "../../common/util/render-status";
import { MobileAwareMixin } from "../../mixins/mobile-aware-mixin";
import {
  configContext,
  internationalizationContext,
  uiContext,
} from "../../data/context";
import type { Themes } from "../../data/ws-themes";
import type {
  ECOption,
  HaECOption,
  HaECSeries,
  HaECSeriesItem,
  HaTooltipOption,
} from "../../resources/echarts/echarts";
import type {
  HomeAssistantConfig,
  HomeAssistantInternationalization,
  HomeAssistantUI,
} from "../../types";
import { isMac } from "../../util/is_mac";
import "../chips/ha-assist-chip";
import "../ha-icon-button";
import { ZOOM_SLIDER_HEIGHT } from "./ha-chart-zoom-slider";
import { formatTimeLabel } from "./axis-label";
import type { ChartSonification } from "./chart-sonification";
import { canSonifyChart, sonifyChart } from "./chart-sonification";
import { downSampleLineData } from "./down-sample";
import { wrapLitTooltipFormatter } from "./lit-tooltip-formatter";

export const MIN_TIME_BETWEEN_UPDATES = 60 * 5 * 1000;
const LEGEND_OVERFLOW_LIMIT = 10;
const LEGEND_OVERFLOW_LIMIT_MOBILE = 6;
const DOUBLE_TAP_TIME = 300;
// echarts' own default, restored when switching back from touch input
const DEFAULT_TOOLTIP_TRIGGER_ON = "mousemove|click|mousewheel";
const ZOOM_SLIDER_BOTTOM = 4;
// Room the plot gives up at its bottom while the zoom slider shows
const ZOOM_SLIDER_SPACE = ZOOM_SLIDER_BOTTOM + ZOOM_SLIDER_HEIGHT + 8;
const ZOOM_RESET_SIZE = 24;
const ZOOM_RESET_OFFSET = ZOOM_RESET_SIZE + 4;
// A narrower drag selection is a sloppy click rather than a zoom
const MIN_DRAG_ZOOM_WIDTH = 8;
export const DEFAULT_CHART_WIDTH = 500;
// Slack so a chart is up to date before a scroll can reach it. A phone screen
// is short enough for a whole screenful; on a desktop that would cover the page.
const VISIBILITY_ROOT_MARGIN_NARROW = "100%";
const VISIBILITY_ROOT_MARGIN = "300px";
const DEFERRED_PROPS = [
  "options",
  "data",
  "_hiddenDatasets",
  "_isZoomed",
] as const;

type RawSeriesOption = Exclude<
  NonNullable<ECOption["series"]>,
  readonly unknown[]
>;

const toEChartsFormatter = (
  fn: ReturnType<typeof wrapLitTooltipFormatter>
): NonNullable<TooltipOption["formatter"]> =>
  fn as NonNullable<TooltipOption["formatter"]>;

const convertHaTooltipFormatter = (tooltip: HaTooltipOption): TooltipOption => {
  const { formatter, ...rest } = tooltip;
  const next: TooltipOption = { ...rest };
  if (typeof formatter === "function") {
    next.formatter = toEChartsFormatter(wrapLitTooltipFormatter(formatter));
  } else if (formatter !== undefined) {
    next.formatter = formatter;
  }
  return next;
};

const processSeriesTooltipFormatter = (s: HaECSeriesItem): RawSeriesOption => {
  if (s.tooltip && typeof s.tooltip.formatter === "function") {
    return {
      ...s,
      tooltip: convertHaTooltipFormatter(s.tooltip),
    } as RawSeriesOption;
  }
  return s as RawSeriesOption;
};

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
export class HaChartBase extends MobileAwareMixin(LitElement) {
  public chart?: EChartsType;

  @property({ attribute: false }) public data: HaECSeries = [];

  @property({ attribute: false }) public options?: HaECOption;

  @property({ type: String }) public height?: string;

  // Lets cards that key their data on ids have display names announced
  // instead when the chart is navigated with Chart2Music.
  @property({ attribute: false })
  public sonificationLabelFormatter?: (label: string) => string | undefined;

  @property({ attribute: "expand-legend", type: Boolean })
  public expandLegend?: boolean;

  @property({ attribute: "small-controls", type: Boolean })
  public smallControls?: boolean;

  // For charts zoomed from outside, like the synced History charts
  @property({ attribute: "hide-zoom-controls", type: Boolean })
  public hideZoomControls = false;

  // For charts sized to their content, like timelines, which grow to fit the
  // zoom slider instead of giving up plot height
  @property({ attribute: "grow-for-zoom-slider", type: Boolean })
  public growForZoomSlider = false;

  // extraComponents is not reactive and should not trigger updates
  public extraComponents?: any[];

  @state()
  @consume({ context: uiContext, subscribe: true })
  @transform<HomeAssistantUI, Themes>({
    transformer: ({ themes }) => themes,
  })
  private _themes!: Themes;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: HomeAssistantInternationalization;

  @consume({ context: configContext, subscribe: true })
  @transform<HomeAssistantConfig, HassConfig>({
    transformer: ({ config }) => config,
  })
  private _hassConfig!: HassConfig;

  @property({ attribute: "click-label-for-more-info", type: Boolean })
  public clickLabelForMoreInfo = false;

  @state() private _isZoomed = false;

  // Separate from _isZoomed, whose touch handling reruns graph layouts
  @state() private _isGraphRoamed = false;

  @state() private _minutesDifference = 24 * 60;

  @state() private _hiddenDatasets = new Set<string>();

  @query(".chart") private _chartContainer?: HTMLDivElement;

  @query(".sonification-output")
  private _sonificationOutput?: HTMLDivElement;

  private _sonification?: ChartSonification;

  @state() private _sonificationLoading = false;

  @state() private _sonificationUnavailable = false;

  @state() private _sonificationFocusHeld = false;

  private _isTouchDevice = "ontouchstart" in window;

  // Whether the chart was last used with touch rather than a mouse. With touch
  // the tooltip only opens on a tap, like on mobile, while a mouse on the same
  // device still shows it on hover.
  private _touchInput = this._isTouchDevice;

  private _lastTapTime?: number;

  private _doubleTapped = false;

  private _dragToZoom = false;

  private _longPressTimer?: ReturnType<typeof setTimeout>;

  private _longPressTriggered = false;

  private _shouldResizeChart = false;

  private _resizeAnimationDuration?: number;

  private _suspendResize = false;

  private _layoutTransitionActive = false;

  // Both start visible so a chart on screen renders on its first update rather
  // than waiting a frame for the observers. A chart that starts off screen is
  // therefore still built once; only its later updates are gated.
  private _intersecting = true;

  private _hasSize = true;

  // Reported by the ResizeObserver, so rendering and downsampling need not
  // measure layout themselves once it has fired.
  private _contentWidth?: number;

  // @ts-ignore
  private _resizeController = new ResizeController(this, {
    callback: (entries) => {
      // The controller also fires once with no entries when it starts observing.
      const contentRect = entries[entries.length - 1]?.contentRect;
      if (contentRect) {
        this._contentWidth = contentRect.width;
        this._hasSize = contentRect.width > 0 && contentRect.height > 0;
      }
      if (this.chart) {
        if (this._suspendResize) {
          this._shouldResizeChart = true;
        } else if (!this.chart.getZr().animation.isFinished()) {
          this._shouldResizeChart = true;
        } else {
          this.chart.resize();
        }
      }
      if (!this._suspendResize) {
        this._applyDeferredWork();
      }
    },
  });

  private _loading = false;

  private _reducedMotion = false;

  private _listeners: (() => void)[] = [];

  private _originalZrFlush?: () => void;

  private _pendingSetup = false;

  private _pendingUpdate?: Set<PropertyKey>;

  private _legendItemCount?: number;

  // Zoom window in percent
  @state() private _zoomRange: [number, number] = [0, 100];

  // Keeps the zoom slider while in use, also once it reaches the full range
  @state() private _zoomSliderHeld = false;

  // Whether the grid currently leaves room for the zoom slider
  private _zoomSliderRoom = false;

  private _wheelPanPixels = 0;

  private _wheelPanFrame?: number;

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._removeOutsideTapListener();
    this._legendPointerCancel();
    this._pendingSetup = false;
    this._pendingUpdate = undefined;
    if (this._wheelPanFrame !== undefined) {
      cancelAnimationFrame(this._wheelPanFrame);
      this._wheelPanFrame = undefined;
    }
    this._wheelPanPixels = 0;
    // The observers are about to be torn down, so nothing would correct a stale
    // value if this element is reattached inside a hidden container.
    this._intersecting = false;
    this._hasSize = false;
    this._contentWidth = undefined;
    while (this._listeners.length) {
      this._listeners.pop()!();
    }
    this._disposeSonification();
    this.chart?.dispose();
    this.chart = undefined;
    this._originalZrFlush = undefined;
  }

  public connectedCallback() {
    super.connectedCallback();
    if (this.hasUpdated) {
      this._pendingSetup = true;
      afterNextRender(() => this._applyDeferredWork());
    }

    const handleVisibilityChange = () => this._applyDeferredWork();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    this._listeners.push(() =>
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    );

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        this._intersecting = entries[entries.length - 1].isIntersecting;
        if (!this._suspendResize) {
          this._applyDeferredWork();
        }
      },
      {
        rootMargin: this._isMobileSize
          ? VISIBILITY_ROOT_MARGIN_NARROW
          : VISIBILITY_ROOT_MARGIN,
      }
    );
    intersectionObserver.observe(this);
    this._listeners.push(() => intersectionObserver.disconnect());

    this._listeners.push(
      listenMediaQuery("(prefers-reduced-motion)", (matches) => {
        if (this._reducedMotion !== matches) {
          this._reducedMotion = matches;
          this._setChartOptions({ animation: !this._reducedMotion });
        }
      })
    );

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
        this._applyDeferredWork();
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
    if (!this.isConnected) {
      return;
    }
    // The only measurement taken here: neither observer has reported yet, and a
    // chart first rendered inside a hidden container has to defer its setup
    // rather than build against a guessed width.
    this._hasSize = this.clientWidth > 0 && this.clientHeight > 0;
    if (this._isVisible()) {
      this._setupChart();
    } else {
      this._pendingSetup = true;
    }
  }

  private _isVisible() {
    return (
      document.visibilityState !== "hidden" &&
      this._hasSize &&
      this._intersecting
    );
  }

  private _deferUpdate(changedProps: PropertyValues) {
    for (const prop of DEFERRED_PROPS) {
      if (!changedProps.has(prop)) {
        continue;
      }
      if (!this._pendingUpdate) {
        this._pendingUpdate = new Set();
      }
      this._pendingUpdate.add(prop);
    }
  }

  private async _applyDeferredWork() {
    if (!this._pendingSetup && !this._pendingUpdate) {
      return;
    }
    if (!this.isConnected || !this._isVisible()) {
      return;
    }
    if (this._pendingSetup) {
      await this._setupChart();
      return;
    }
    const pending = this._pendingUpdate!;
    this._pendingUpdate = undefined;
    this._applyChartUpdate(pending);
  }

  public willUpdate(changedProps: PropertyValues): void {
    if (!this.chart) {
      return;
    }
    const themeChanged = changedProps.has("_themes") && this.hasUpdated;
    if (!themeChanged && !DEFERRED_PROPS.some((p) => changedProps.has(p))) {
      return;
    }
    const invisible = !this._isVisible();
    if (themeChanged) {
      if (invisible) {
        this._pendingSetup = true;
        this._pendingUpdate = undefined;
      } else {
        this._setupChart();
      }
      return;
    }
    if (changedProps.has("options")) {
      // Separate 'if' from below since this must be updated before _getSeries().
      // It stays out of _applyChartUpdate so a replay cannot request another
      // update and turn one catch-up render into two.
      this._updateHiddenStatsFromOptions(this.options);
    }
    if (invisible) {
      if (!this._pendingSetup) {
        this._deferUpdate(changedProps);
      }
      return;
    }
    this._applyChartUpdate(changedProps);
  }

  private _applyChartUpdate(changedProps: { has: (prop: string) => boolean }) {
    let chartOptions: ECOption = {};
    if (changedProps.has("data") || changedProps.has("_hiddenDatasets")) {
      chartOptions.series = this._getSeries();
      // New data, or a series shown again, may well be convertible where the
      // last set was not.
      this._sonificationUnavailable = false;
      // The connection is built from the series that had data at the time, so
      // drop it and let the next focus rebuild it against the current set.
      if (
        this._sonification &&
        (changedProps.has("_hiddenDatasets") ||
          !canSonifyChart(this.data, this._hiddenDatasets))
      ) {
        this._disposeSonification();
      }
    }
    if (changedProps.has("options")) {
      chartOptions = { ...chartOptions, ...this._createOptions() };
      this._disposeSonification();
    }
    let legendChanged = false;
    if (changedProps.has("options") || changedProps.has("data")) {
      const legendItemCount = this._getLegendItems()?.length;
      legendChanged = legendItemCount !== this._legendItemCount;
      this._legendItemCount = legendItemCount;
    }
    if (Object.keys(chartOptions).length > 0) {
      this._setChartOptions(chartOptions);
      if (changedProps.has("options")) {
        this._updateDragToZoom();
      }
    }
    if (
      chartOptions.series ||
      (this._isTouchDevice && changedProps.has("_isZoomed"))
    ) {
      this._updateSankeyRoam();
    }
    if (legendChanged) {
      // Within a fixed height the host does not resize when the legend grows.
      // Without animation, setOption has already fired "finished" by now.
      this._shouldResizeChart = true;
      this._resizeAnimationDuration = 250;
      this.updateComplete.then(() => this._resizeChartIfNeeded());
    }
  }

  protected updated() {
    const room = this._showZoomSlider();
    if (this.chart && room !== this._zoomSliderRoom) {
      this._zoomSliderRoom = room;
      this.chart.setOption({ grid: this._getGridOption() });
    }
  }

  protected render() {
    const sonifiable =
      !this._sonificationUnavailable &&
      canSonifyChart(this.data, this._hiddenDatasets);
    const showZoomSlider = this._showZoomSlider();
    return html`
      <div
        class="container ${classMap({ "has-height": !!this.height })}"
        style=${styleMap({
          height:
            showZoomSlider && this.growForZoomSlider && this.height
              ? `calc(${this.height} + ${ZOOM_SLIDER_SPACE}px)`
              : this.height,
        })}
      >
        <div
          class="chart-container"
          style=${styleMap({
            height: this.height ? undefined : `${this._getDefaultHeight()}px`,
          })}
        >
          <div
            class="chart ${classMap({
              "touch-scrub": this._isTouchDevice && this._hasZoomableXAxis(),
            })}"
            role=${ifDefined(sonifiable ? "application" : undefined)}
            tabindex=${ifDefined(
              sonifiable ? "0" : this._sonificationFocusHeld ? "-1" : undefined
            )}
            aria-label=${ifDefined(
              sonifiable
                ? this._i18n.localize("ui.components.history_charts.chart")
                : undefined
            )}
            aria-busy=${ifDefined(this._sonificationLoading ? "true" : undefined)}
            @focus=${this._handleChartFocus}
            @blur=${this._handleChartBlur}
            @pointerdown=${this._handleChartPointer}
            @pointermove=${this._handleChartPointer}
            @pointercancel=${this._handleChartPointerCancel}
            @mousedown=${this._handleChartMouseDown}
            @wheel=${this._handleWheel}
          ></div>
          ${showZoomSlider ? this._renderZoomSlider() : nothing}
        </div>
        <div class="sonification-output"></div>
        ${this._renderLegend()}
        <div class="top-controls ${classMap({ small: this.smallControls })}">
          <slot name="search"></slot>
          <div
            class="chart-controls ${classMap({ small: this.smallControls })}"
          >
            ${
              (this._isZoomed || this._isGraphRoamed) &&
              !this.hideZoomControls &&
              !showZoomSlider
                ? html`<ha-icon-button
                    class="zoom-reset"
                    .path=${mdiRestart}
                    @click=${this._handleZoomReset}
                    title=${this._i18n.localize(
                      "ui.components.history_charts.zoom_reset"
                    )}
                  ></ha-icon-button>`
                : nothing
            }
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
    // Index datasets by id and name so each legend item is an O(1) lookup
    // instead of scanning every dataset twice. Charts can have many series.
    const datasetById = new Map<unknown, (typeof datasets)[number]>();
    const datasetByName = new Map<unknown, (typeof datasets)[number]>();
    for (const dataset of datasets) {
      if (dataset.id !== undefined && !datasetById.has(dataset.id)) {
        datasetById.set(dataset.id, dataset);
      }
      if (dataset.name !== undefined && !datasetByName.has(dataset.name)) {
        datasetByName.set(dataset.name, dataset);
      }
    }

    const overflowLimit = this._isMobileSize
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
          let value = "";
          let noLabelClick = false;
          const name = typeof item === "string" ? item : (item.name ?? "");
          let id: string;
          if (typeof item === "string") {
            id = item;
          } else {
            id = item.id ?? name;
            value = item.value ?? "";
            itemStyle = item.itemStyle ?? {};
            noLabelClick = item.noLabelClick ?? false;
          }
          const labelClickable = this.clickLabelForMoreInfo && !noLabelClick;
          const dataset = datasetById.get(id) ?? datasetByName.get(id);
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
              .title=${this._i18n.localize(
                "ui.components.history_charts.toggle_visibility"
              )}
              @click=${this._toggleDataset}
            >
              <ha-svg-icon
                .path=${
                  this._hiddenDatasets.has(id)
                    ? mdiCircleOutline
                    : mdiCheckCircle
                }
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
        ${
          items.length > overflowLimit
            ? html`<li>
                <ha-assist-chip
                  @click=${this._toggleExpandedLegend}
                  filled
                  label=${
                    this.expandLegend
                      ? this._i18n.localize(
                          "ui.components.history_charts.collapse_legend"
                        )
                      : `${this._i18n.localize(
                          "ui.components.history_charts.expand_legend"
                        )} (${items.length - overflowLimit})`
                  }
                >
                  <ha-svg-icon
                    slot="trailing-icon"
                    .path=${this.expandLegend ? mdiChevronUp : mdiChevronDown}
                  ></ha-svg-icon>
                </ha-assist-chip>
              </li>`
            : nothing
        }
      </ul>
    </div>`;
  }

  // Chart2Music adds ~45 kB gzipped, so it is only fetched once someone actually
  // moves keyboard focus into a chart.
  private async _handleChartFocus() {
    // Dropping tabindex off the active element resets focus to the document and
    // costs the user their place in the tab order, so stay programmatically
    // focusable for as long as we hold focus, however we stop being sonifiable.
    this._sonificationFocusHeld = true;
    // Clicks and taps focus the chart too. Chart2Music only responds to the
    // keyboard, and once connected it moves the tooltip to the first point, so
    // pointer focus must not start it.
    if (
      this._sonification ||
      this._sonificationLoading ||
      !this._chartContainer?.matches(":focus-visible")
    ) {
      return;
    }
    await this._applyDeferredWork();
    if (!this.chart) {
      return;
    }
    this._sonificationLoading = true;
    try {
      const sonification = await sonifyChart(this.chart, {
        cc: this._sonificationOutput!,
        localize: this._i18n.localize,
        locale: this._i18n.locale,
        config: this._hassConfig,
        formatLabel: this.sonificationLabelFormatter,
        onError: () => {
          // Charts the extension cannot describe stay silent rather than
          // dropping an error on someone who only pressed Tab.
        },
      });
      if (!this.isConnected || !this.chart) {
        sonification?.dispose();
        return;
      }
      if (!sonification) {
        // Nothing came back, so stop offering a focus stop that leads nowhere.
        this._sonificationUnavailable = true;
        return;
      }
      this._sonification = sonification;
      if (this.shadowRoot?.activeElement === this._chartContainer) {
        // Chart2Music reads its summary and key hints on focus, which already
        // happened while it was still being fetched.
        this._chartContainer!.dispatchEvent(new FocusEvent("focus"));
      }
    } catch (_err) {
      // Never let a failure here escape a focus handler. The tab stop stays, so
      // focusing the chart again retries.
    } finally {
      this._sonificationLoading = false;
    }
  }

  private _handleChartBlur() {
    this._sonificationFocusHeld = false;
  }

  private _disposeSonification() {
    this._sonification?.dispose();
    this._sonification = undefined;
  }

  private _formatTimeLabel = (value: number | Date) =>
    formatTimeLabel(
      value,
      this._i18n.locale,
      this._hassConfig,
      (this._minutesDifference * (this._zoomRange[1] - this._zoomRange[0])) /
        100
    );

  private async _setupChart() {
    if (this._loading) {
      this._pendingSetup = true;
      return;
    }
    this._loading = true;
    this._pendingSetup = false;
    this._pendingUpdate = undefined;
    try {
      // The connection holds a reference to the chart instance, so it cannot
      // outlive it. Focusing the chart again reconnects.
      this._disposeSonification();
      // the new chart starts with its tooltip hidden, so nothing would remove it
      this._removeOutsideTapListener();
      if (this.chart) {
        this.chart.dispose();
        this.chart = undefined;
        this._originalZrFlush = undefined;
      }
      const echarts = (await import("../../resources/echarts/echarts")).default;

      if (this.extraComponents?.length) {
        echarts.use(this.extraComponents);
      }

      const style = getComputedStyle(this);
      echarts.registerTheme("custom", this._createTheme(style));

      this.chart = echarts.init(this._chartContainer!, "custom");
      this._dragToZoom = false;
      // Restored once the new chart is set up
      const [zoomStart, zoomEnd] = this._zoomRange;
      this._zoomRange = [0, 100];
      if (this._isZoomed) {
        this._isZoomed = false;
        fireEvent(this, "chart-sankeyroam", { zoom: 1 });
      }
      this._isGraphRoamed = false;
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
        const zoomed = Math.abs(sankeySeries.zoom - 1) > 1e-6;
        this._isZoomed = zoomed;
        // Before setOption, which lays the labels out again
        fireEvent(this, "chart-sankeyroam", { zoom: sankeySeries.zoom });
        if (!zoomed) {
          // Reset center when fully zoomed out
          this.chart!.setOption({
            series: [{ id: sankeySeries.id, center: null }],
          });
        }
        // Clear cached emphasis states so labels don't revert to pre-zoom sizes
        this.chart!.dispatchAction({ type: "downplay" });
      });

      this.chart.on("graphroam", () => {
        this._isGraphRoamed = this._getGraphRoams().some(
          ({ zoom, x, y }) =>
            Math.abs(zoom - 1) > 1e-6 || Math.abs(x) > 0.5 || Math.abs(y) > 0.5
        );
      });

      if (!this.options?.dataZoom) {
        this.chart.getZr().on("dblclick", this._handleClickZoom);
      }
      this.chart.on("finished", this._handleChartRenderFinished);
      if (this._isTouchDevice) {
        // Timed from the first tap's release, as on Android
        const zr = this.chart.getZr();
        zr.on("mousedown", (e: ECElementEvent) => {
          // The second tap's click is often lost, so this cannot wait for it
          this._doubleTapped = false;
          if (
            e.zrByTouch &&
            (e.event as unknown as TouchEvent).touches?.length === 1 &&
            this._lastTapTime &&
            Date.now() - this._lastTapTime < DOUBLE_TAP_TIME
          ) {
            this._lastTapTime = undefined;
            this._doubleTapped = true;
            this._handleClickZoom(e);
          }
        });
        zr.on("click", (e: ECElementEvent) => {
          if (e.zrByTouch) {
            this._lastTapTime = this._doubleTapped ? undefined : Date.now();
          }
        });
        // the tooltip only opens on a tap, so a tap anywhere else closes it
        this.chart.on("showTip", this._addOutsideTapListener);
        this.chart.on("hideTip", this._removeOutsideTapListener);
      }

      this._updateHiddenStatsFromOptions(this.options);

      this.chart.setOption({
        ...this._createOptions(),
        series: this._getSeries(),
      });
      this._legendItemCount = this._getLegendItems()?.length;
      this._updateSankeyRoam();
      this._updateDragToZoom();
      if (zoomStart !== 0 || zoomEnd !== 100) {
        this.zoom(zoomStart, zoomEnd, true);
      }
    } finally {
      this._loading = false;
      this._applyDeferredWork();
    }
  }

  // Return an array of all IDs associated with the legend item of the primaryId
  private _getAllIdsFromLegend(
    options: HaECOption | undefined,
    primaryId: string
  ): string[] {
    if (!options) return [primaryId];
    const legend = ensureArray(this.options?.legend || [])[0] as
      LegendComponentOption | undefined;

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
  private _updateHiddenStatsFromOptions(options: HaECOption | undefined) {
    if (!options) return;
    const legend = ensureArray(this.options?.legend || [])[0] as
      LegendComponentOption | undefined;
    const hiddenCount = this._hiddenDatasets.size;
    Object.entries(legend?.selected || {}).forEach(([stat, selected]) => {
      if (selected === false) {
        this._getAllIdsFromLegend(options, stat).forEach((id) =>
          this._hiddenDatasets.add(id)
        );
      }
    });
    // Flagging this rebuilds and downsamples every series, so only when needed
    if (this._hiddenDatasets.size !== hiddenCount) {
      this.requestUpdate("_hiddenDatasets");
    }
  }

  // A chart can switch type (e.g. pie and bar) without being rebuilt
  private _updateDragToZoom() {
    const active = !this._touchInput && this._hasZoomableXAxis();
    if (!this.chart || active === this._dragToZoom) {
      return;
    }
    this._dragToZoom = active;
    this.chart.dispatchAction({
      type: "takeGlobalCursor",
      key: "dataZoomSelect",
      dataZoomSelectActive: active,
    });
  }

  private _hasZoomableXAxis() {
    const xAxis = ensureArray(this.options?.xAxis)?.[0] as
      XAXisOption | undefined;
    const yAxis = ensureArray(this.options?.yAxis)?.[0] as
      YAXisOption | undefined;
    return Boolean(
      xAxis &&
      xAxis.show !== false &&
      !this.options?.dataZoom &&
      // vertical data zoom doesn't work well in this case and horizontal is pointless
      !(xAxis.type === "value" && yAxis?.type === "category")
    );
  }

  private _getDataZoomConfig(): DataZoomComponentOption[] | undefined {
    if (!this._hasZoomableXAxis()) {
      return undefined;
    }
    return [
      {
        id: "dataZoom",
        type: "inside",
        orient: "horizontal",
        filterMode: this._getDataZoomFilterMode() as any,
        xAxisIndex: 0,
        // Panning is left to the slider and horizontal scrolling
        moveOnMouseMove: false,
        preventDefaultMouseMove: false,
      },
    ];
  }

  private _showZoomSlider() {
    const [start, end] = this._zoomRange;
    return (
      !this.hideZoomControls &&
      this._hasZoomableXAxis() &&
      (this._zoomSliderHeld || start !== 0 || end !== 100)
    );
  }

  private _renderZoomSlider() {
    const resetLabel = this._i18n.localize(
      "ui.components.history_charts.zoom_reset"
    );
    return html`
      ${
        this._isZoomed
          ? html`<ha-icon-button
              class="slider-reset"
              .path=${mdiRestart}
              .label=${resetLabel}
              @click=${this._handleZoomReset}
            ></ha-icon-button>`
          : nothing
      }
      <ha-chart-zoom-slider
        class="zoom-slider"
        .start=${this._zoomRange[0]}
        .end=${this._zoomRange[1]}
        @zoom-slider-changed=${this._handleZoomSliderChanged}
        @pointerdown=${this._holdZoomSlider}
        @focusin=${this._holdZoomSlider}
        @pointerup=${this._releaseZoomSlider}
        @pointercancel=${this._releaseZoomSlider}
        @focusout=${this._releaseZoomSlider}
      ></ha-chart-zoom-slider>
    `;
  }

  private _handleZoomSliderChanged(
    ev: HASSDomEvent<HASSDomEvents["zoom-slider-changed"]>
  ) {
    this._setZoomWindow(ev.detail.start, ev.detail.end);
  }

  private _holdZoomSlider() {
    this._zoomSliderHeld = true;
  }

  private _releaseZoomSlider(
    ev: Event & HASSDomCurrentTargetEvent<HTMLElement>
  ) {
    // A mouse press focuses the slider, so it is kept until it loses focus
    this._zoomSliderHeld =
      ev.type !== "focusout" && ev.currentTarget.matches(":focus-within");
  }

  private _getGridOption() {
    const grid = this.options?.grid;
    if (!grid || !this._zoomSliderRoom) {
      return grid;
    }
    const [first, ...rest] = ensureArray(grid);
    const bottom = typeof first.bottom === "number" ? first.bottom : 0;
    return [{ ...first, bottom: bottom + ZOOM_SLIDER_SPACE }, ...rest];
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
      grid: this._getGridOption(),
      legend,
      xAxis,
    };

    if (options.tooltip) {
      const isMobile = this._isMobileSize;
      // Shallow-copy each tooltip object so wrap/mobile mutations don't leak
      // back into the caller's options.tooltip reference (callers may cache the
      // options object via memoizeOne, in which case in-place mutation would
      // pollute that cache across chart instances).
      const processTooltip = (tooltip: HaTooltipOption): TooltipOption => {
        const next = convertHaTooltipFormatter(tooltip);
        if (isMobile) {
          // mobile charts are full width so we need to confine the tooltip to the chart
          next.confine = true;
          next.appendTo = undefined;
        }
        if (isMobile || this._touchInput) {
          next.triggerOn = "click";
        }
        return next;
      };
      const haTooltip = options.tooltip;
      const processedTooltip = Array.isArray(haTooltip)
        ? haTooltip.map(processTooltip)
        : processTooltip(haTooltip);
      return {
        ...options,
        tooltip: processedTooltip,
      } as ECOption;
    }
    return options as ECOption;
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
        // At this size the symbols are invisible, but drawing one per data point
        // makes every tooltip move repaint hundreds of them. ECharts still draws
        // the symbol of the hovered point.
        showSymbol: false,
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
      XAXisOption | undefined;
    const series = ensureArray(this.data).map((s) => {
      const data = this._hiddenDatasets.has(String(s.id ?? s.name))
        ? undefined
        : s.data;
      let result = {
        ...s,
        data,
      } as HaECSeriesItem;
      if (data && s.type === "line") {
        if ((s as LineSeriesOption).sampling === "minmax") {
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
          result = {
            ...result,
            sampling: undefined,
            data: downSampleLineData(
              data as LineSeriesOption["data"],
              // 0 while inside a hidden container, e.g. a section with a visibility condition
              ((this._contentWidth ?? this.clientWidth) ||
                DEFAULT_CHART_WIDTH) * window.devicePixelRatio,
              minX,
              maxX
            ),
          } as HaECSeriesItem;
        }
      }
      return processSeriesTooltipFormatter(result);
    });
    return series as ECOption["series"];
  }

  private _getDefaultHeight() {
    return Math.max((this._contentWidth ?? this.clientWidth) / 2, 200);
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
        fireEvent(this, "chart-sankeyroam", { zoom: 2 });
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
    if (!this._hasZoomableXAxis()) {
      return;
    }
    // Kept within the axis, as ECharts does, so the datazoom event matches it
    const start = Math.min(
      Math.max((e.offsetX / this.chart.getWidth()) * 100 - 15, 0),
      70
    );
    const range = this._isZoomed ? [0, 100] : [start, start + 30];
    this.chart.dispatchAction({
      type: "dataZoom",
      start: range[0],
      end: range[1],
    });
  };

  public zoom(start: number, end: number, silent = false) {
    if (!this.chart || this._pendingSetup) {
      // Replayed by _setupChart
      this._setZoomRange(start, end);
      return;
    }
    this._setZoomWindow(start, end, silent);
  }

  // Captured: ECharts cancels every wheel event over the plot, even one it
  // ignores. Only a zoom gesture (Ctrl/Cmd, or a trackpad pinch) goes on to it.
  @eventOptions({ capture: true })
  private _handleWheel(ev: WheelEvent) {
    if (this.options?.dataZoom || ev.ctrlKey || ev.metaKey) {
      return;
    }
    ev.stopPropagation();
    // Not _isZoomed, which a Sankey roam sets without an axis to pan
    const [start, end] = this._zoomRange;
    if (!this.chart || (start === 0 && end === 100)) {
      return;
    }
    const delta = ev.shiftKey ? ev.deltaX || ev.deltaY : ev.deltaX;
    if (!delta || (!ev.shiftKey && Math.abs(ev.deltaX) < Math.abs(ev.deltaY))) {
      return;
    }
    ev.preventDefault();
    this._wheelPanPixels +=
      ev.deltaMode === WheelEvent.DOM_DELTA_PAGE
        ? delta * this.chart.getWidth()
        : ev.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? delta * 16
          : delta;
    // Trackpads fire many wheel events per frame
    this._wheelPanFrame ??= requestAnimationFrame(this._flushWheelPan);
  }

  private _flushWheelPan = () => {
    this._wheelPanFrame = undefined;
    const pixels = this._wheelPanPixels;
    this._wheelPanPixels = 0;
    if (!this.chart || !pixels) {
      return;
    }
    const [start, end] = this._zoomRange;
    const shift = (pixels * (end - start)) / this._getXAxisPixelWidth();
    const clamped = Math.max(-start, Math.min(100 - end, shift));
    if (clamped) {
      this._setZoomWindow(start + clamped, end + clamped);
    }
  };

  private _setZoomWindow(start: number, end: number, silent = false) {
    // An update animation would restart on every move and lag the gesture
    this.chart?.dispatchAction(
      { type: "dataZoom", start, end, animation: { duration: 0 } },
      { silent }
    );
    if (silent) {
      // Otherwise recorded by the datazoom handler
      this._setZoomRange(start, end);
    }
  }

  private _handleZoomReset() {
    const option = this.chart?.getOption();
    const sankeySeries = (option?.series as any[])?.filter(
      (s: any) => s.type === "sankey"
    );
    // Before the dataZoom action and setOption, which lay the labels out again
    if (sankeySeries?.length) {
      fireEvent(this, "chart-sankeyroam", { zoom: 1 });
    }
    // A dataZoom action reruns the layout of every series, graphs included
    if (this._isZoomed) {
      this.chart?.dispatchAction({ type: "dataZoom", start: 0, end: 100 });
    }
    // Reset sankey roam zoom
    if (sankeySeries?.length) {
      this.chart?.setOption({
        series: sankeySeries.map((s: any) => ({
          id: s.id,
          zoom: 1,
          center: null,
        })),
      });
      this._isZoomed = false;
    }
    this._getGraphRoams().forEach(({ series, zoom, x, y }) => {
      this.chart!.dispatchAction({
        type: "graphRoam",
        seriesId: series.id,
        dx: -x,
        dy: -y,
        zoom: 1 / zoom,
        originX: 0,
        originY: 0,
      });
      // The action stores an absolute center, which a later re-fit would keep
      series.option.center = null;
      series.option.zoom = 1;
    });
  }

  private _getGraphRoams(): {
    series: any;
    zoom: number;
    x: number;
    y: number;
  }[] {
    const graphSeries: any[] =
      // @ts-ignore private method but no other way to get the roam transform
      this.chart?.getModel().getSeriesByType("graph") ?? [];
    return graphSeries.flatMap((series) => {
      const roam = series.coordinateSystem?.getRoamTransform?.();
      return roam ? [{ series, zoom: roam[0], x: roam[4], y: roam[5] }] : [];
    });
  }

  private _updateSankeyRoam() {
    const option = this.chart?.getOption();
    const sankeySeries = (option?.series as any[])?.filter(
      (s: any) => s != null && s.type === "sankey"
    );
    if (sankeySeries?.length) {
      this.chart?.setOption({
        series: sankeySeries.map((s: any) => ({
          id: s.id,
          roam: this._getSankeyRoam(),
        })),
      });
    }
  }

  // On touch devices a drag pans only once zoomed, so an unzoomed chart
  // does not swallow page scrolling. Pinch still zooms via "scale".
  // A plain wheel never reaches ECharts, see _handleWheel.
  private _getSankeyRoam(): boolean | "scale" {
    if (this._isTouchDevice) {
      return this._isZoomed ? true : "scale";
    }
    return true;
  }

  // Captured, so the trigger and drag to zoom are switched before echarts
  // handles the same event: before it acts on a tap, and before the first
  // mouse move after touch input. Only on touch devices. A pen counts as
  // touch, as it does for echarts.
  @eventOptions({ capture: true })
  private _handleChartPointer(ev: PointerEvent) {
    const touchInput = this._isTouchDevice && ev.pointerType !== "mouse";
    if (ev.type === "pointerdown") {
      // zrender listens to pointer events instead of mouse events on Edge
      this._handleChartMouseDown(ev);
      // Drag to zoom cancels the press, so a focused slider would never blur
      this._zoomSliderHeld = false;
    }
    if (touchInput !== this._touchInput) {
      this._touchInput = touchInput;
      this._updateDragToZoom();
      if (this.chart && this.options?.tooltip) {
        const tooltip = this._createOptions().tooltip;
        this.chart.setOption({
          tooltip: ensureArray(tooltip ?? []).map((t) => ({
            triggerOn: t.triggerOn ?? DEFAULT_TOOLTIP_TRIGGER_ON,
          })),
        });
      }
    }
    // zrender only follows a drag outside the chart once it has moved inside
    // it, so a quick drag out would lose the release and its selection
    if (
      ev.type === "pointerdown" &&
      this._dragToZoom &&
      this._isZoomPress(ev)
    ) {
      this.chart
        ?.getZr()
        .painter.getViewportRoot()
        .setPointerCapture(ev.pointerId);
    }
    // A finger drag along a time axis moves the tooltip, which touch opens on tap
    if (
      touchInput &&
      ev.type === "pointermove" &&
      ev.isPrimary &&
      this.chart &&
      this._hasZoomableXAxis()
    ) {
      const rect = this._chartContainer!.getBoundingClientRect();
      this.chart.dispatchAction({
        type: "showTip",
        x: ev.clientX - rect.left,
        y: ev.clientY - rect.top,
      });
    }
  }

  // The browser took the touch to scroll the page
  private _handleChartPointerCancel(ev: PointerEvent) {
    if (ev.pointerType !== "mouse") {
      this._hideTooltip();
    }
  }

  // Only a primary press starts a drag to zoom; a context menu leaves it stuck
  @eventOptions({ capture: true })
  private _handleChartMouseDown(ev: MouseEvent) {
    if (!this._isZoomPress(ev)) {
      ev.stopPropagation();
    }
  }

  private _isZoomPress(ev: MouseEvent) {
    return ev.button === 0 && !(isMac && ev.ctrlKey);
  }

  private _addOutsideTapListener = () => {
    document.addEventListener("pointerdown", this._handleOutsideTap, {
      capture: true,
      passive: true,
    });
  };

  private _removeOutsideTapListener = () => {
    document.removeEventListener("pointerdown", this._handleOutsideTap, {
      capture: true,
    });
  };

  // A pen does not reliably fire touch events, so this listens to pointer
  // events. The mouse is left out: echarts already hides the tooltip when it
  // leaves the chart, even when the tooltip only opens on click.
  private _handleOutsideTap = (ev: PointerEvent) => {
    if (ev.pointerType !== "mouse" && !ev.composedPath().includes(this)) {
      this._hideTooltip();
    }
  };

  private _hideTooltip() {
    this.chart?.dispatchAction({ type: "hideTip" });
    this.chart?.dispatchAction({
      type: "updateAxisPointer",
      currTrigger: "leave",
    });
  }

  private _getXAxisPixelWidth(): number {
    const axisModel = this.chart
      // @ts-ignore private method but no public way to get the axis extent
      ?.getModel()
      .getComponent("xAxis", 0) as
      { axis?: { getExtent(): [number, number] } } | undefined;
    const extent = axisModel?.axis?.getExtent();
    const width = extent ? Math.abs(extent[1] - extent[0]) : 0;
    return width || this.chart!.getWidth();
  }

  private _setZoomRange(start: number, end: number) {
    this._zoomRange = [start, end];
    this._isZoomed = start !== 0 || end !== 100;
  }

  private _handleDataZoomEvent(e: any) {
    const zoomData = e.batch?.[0] ?? e;
    let start: number = zoomData.start;
    let end: number = zoomData.end;
    if (typeof start !== "number" || typeof end !== "number") {
      // A drag selection reports axis values; ECharts already moved the window
      const dataZoom = this.chart
        // @ts-ignore private method, getOption() would clone all series data
        ?.getModel()
        .queryComponents({ mainType: "dataZoom", id: "dataZoom" })[0] as
        { getPercentRange(): [number, number] | undefined } | undefined;
      [start, end] = dataZoom?.getPercentRange() ?? [0, 100];
      const [prevStart, prevEnd] = this._zoomRange;
      const pixels =
        ((end - start) / (prevEnd - prevStart)) * this._getXAxisPixelWidth();
      if (pixels < MIN_DRAG_ZOOM_WIDTH) {
        this.chart!.dispatchAction(
          {
            type: "dataZoom",
            start: prevStart,
            end: prevEnd,
            animation: { duration: 0 },
          },
          { silent: true }
        );
        return;
      }
      // In percent, like every other zoom, so it stays in step with _zoomRange
      this.chart!.dispatchAction(
        { type: "dataZoom", start, end },
        { silent: true }
      );
    }

    this._setZoomRange(start, end);
    if (this._isTouchDevice) {
      this.chart?.dispatchAction({ type: "hideTip" });
    }
    fireEvent(this, "chart-zoom", { start, end });
  }

  // Long-press to solo on touch/pen devices (500ms, consistent with action-handler-directive)
  private _legendPointerDown(
    ev: PointerEvent & HASSDomCurrentTargetEvent<HTMLElement>
  ) {
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

  private _toggleDataset(
    ev: MouseEvent & HASSDomCurrentTargetEvent<HTMLElement>
  ) {
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

  private _labelClick(ev: MouseEvent & HASSDomCurrentTargetEvent<HTMLElement>) {
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
      position: relative;
      width: 100%;
      max-height: var(--chart-max-height, 350px);
      overflow: visible;
    }
    /* The chart is not mirrored in RTL, so neither is the slider */
    .slider-reset {
      position: absolute;
      left: 0;
      bottom: ${ZOOM_SLIDER_BOTTOM + ZOOM_SLIDER_HEIGHT / 2 - ZOOM_RESET_SIZE / 2}px;
      --ha-icon-button-size: ${ZOOM_RESET_SIZE}px;
      --mdc-icon-size: 18px;
      --ha-icon-button-padding-inline: 0;
      color: var(--secondary-text-color);
    }
    .zoom-slider {
      position: absolute;
      left: ${ZOOM_RESET_OFFSET}px;
      right: 0;
      bottom: ${ZOOM_SLIDER_BOTTOM}px;
    }
    .slider-reset,
    .zoom-slider {
      animation: zoom-slider-fade-in var(--ha-animation-duration-normal)
        ease-out;
    }
    @keyframes zoom-slider-fade-in {
      from {
        opacity: 0;
      }
    }
    .has-height .chart-container {
      flex: 1;
    }
    .chart {
      height: 100%;
      width: 100%;
    }
    /* Vertical drags scroll the page; horizontal drags and pinches go to the
       chart */
    .chart.touch-scrub {
      touch-action: pan-y;
    }
    .chart:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
      border-radius: var(--ha-border-radius-sm);
    }
    /* Chart2Music renders its announcements here. It must stay in the layout for
       screen readers to pick up the live region, so hide it visually only. */
    .sonification-output {
      position: absolute;
      overflow: hidden;
      clip: rect(0 0 0 0);
      height: 1px;
      width: 1px;
      margin: -1px;
      padding: 0;
      border: 0;
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
      /* overflow: hidden clips descenders (e.g. "g", parentheses) with a tight
         line-height, so give the line box room to contain them */
      line-height: var(--ha-line-height-condensed);
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
      line-height: 1;
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
    /* On touch devices, enlarge the toggle tap target via taller rows and
       leading padding (which also separates it from the previous item), while
       keeping the icon tight to its own label so the pairing stays clear.
       Drop the now-pointless row gap and li padding. */
    @media (pointer: coarse) {
      .chart-legend ul {
        row-gap: 0;
      }
      /* Only grow the toggle rows, not the expand/collapse chip's row. */
      .chart-legend li:has(.legend-toggle) {
        height: 40px;
        padding: 0;
      }
      .chart-legend .legend-toggle {
        padding: 11px;
        padding-inline-end: 4px;
        margin: 0;
      }
    }
    ha-assist-chip {
      height: 100%;
      --ha-button-height: 24px;
      --ha-chip-label-weight: 500;
      --ha-assist-chip-leading-space: var(--ha-space-2);
      --ha-assist-chip-trailing-space: var(--ha-space-2);
      --ha-assist-chip-icon-label-space: var(--ha-space-1);
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
