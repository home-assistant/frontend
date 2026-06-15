import type { PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, svg, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import {
  startOfDay,
  endOfDay,
  addDays,
  startOfISOWeek,
  addWeeks,
  startOfMonth,
  addMonths,
} from "date-fns";
import { getEnergyDataCollection } from "../../../../../data/energy";
import { DEFAULT_ENERGY_COLLECTION_KEY } from "../../../../energy/constants";
import { formatShortDateTime } from "../../../../../common/datetime/format_date_time";
import {
  formatDateWeekdayShort,
  formatDateMonthShort,
  formatDateVeryShort,
} from "../../../../../common/datetime/format_date";
import { formatTime } from "../../../../../common/datetime/format_time";
import "../../../../../components/ha-card";
import "../../../../../components/ha-icon";
import "../common/hui-energy-graph-chip";
import type { SolarOverviewEngine } from "./hui-energy-solar-overview-engine";
import type { SolarOverviewCardConfig } from "./constants";
import type { ChangeBucket } from "./card/energy-stats";
import {
  DEFAULT_SUN_COLOR_HEX,
  VALUE_DECIMALS,
  OUTLINE_FAR,
  OUTLINE_NEAR,
  SEGMENT_FAR,
  SEGMENT_NEAR,
  SUN_R_FAR,
  SUN_R_NEAR,
  SUN_RIM_WIDTH,
  SUN_FILL_OPACITY_BG,
  NIGHT_STROKE_FACTOR,
  HOME_PILL_RADIUS_PX,
  TIMELINE_MAX_TICKS,
  HOUR_MS,
  DAY_MS,
} from "./constants";
import { solarOverviewCardStyles } from "./css/card-styles";
import { darkenHex } from "./card/format";
import {
  refreshPv,
  currentPvRate,
  pvRateAtTime,
  pvNormalizeToWatts,
  formatPvValue,
  resolvePvLiveEntity,
} from "./card/pv";
import {
  refreshBattery,
  batterySampleAtTime,
  formatBatteryPower,
  resolveBatteryEntities,
} from "./card/battery";
import {
  buildArcSegments,
  flowDuration,
  type ArcSegment,
  type SunScene,
  type LabelLayout,
  type HomeSilhouette,
} from "./card/overlays";
import { tick } from "./card/timeline";
import { refreshGrid, formatGridValue } from "./card/grid";
import {
  parseEnergyPrefs,
  refreshHaDailyTotals,
  findCo2SignalEntity,
  EMPTY_ENERGY_DEFAULTS,
  type EnergyDefaults,
} from "./card/energy-prefs";
import {
  enterWeatherMode,
  exitWeatherMode,
  syncWeatherShaderState,
  type CardMode,
} from "./card/weatherMode";
import {
  wattsAtFromChangeSeries,
  fetchChangeSeries,
  adaptivePeriodFor,
} from "./card/energy-stats";
import {
  fetchHaSolarForecast,
  forecastWattsAt,
  type SolarForecastPoint,
} from "./card/energy-forecast";
import {
  computeConfigSig,
  getHomeCoords,
  initEngine,
  cancelPendingRespawn,
  initVisibilityObserver,
} from "./card/init";

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-solar-overview-card": HuiEnergySolarOverviewCard;
  }
}

// Native energy timeline model. Shows EXACTLY the period selected in the Energy
// dashboard (no aggregation/capping); only tick granularity adapts so the axis
// stays readable: <=2d -> 6h, <=14d -> day, <=120d -> ISO week, else month.
type TimelineKind = "intraday" | "days" | "weeks" | "months";

interface TimelineSeparator {
  // Position across the window, as a fraction in [0, 1].
  frac: number;
  date: Date;
}

interface TimelineModel {
  kind: TimelineKind;
  start: Date;
  end: Date;
  separators: TimelineSeparator[];
  // Period labels, centred on the period they name (not on the boundary line).
  labels: TimelineSeparator[];
  dayBoundaries: number[];
}

function buildTimelineModel(
  start: Date,
  end: Date,
  maxTicks: number = TIMELINE_MAX_TICKS
): TimelineModel {
  const total = end.getTime() - start.getTime() || 1;
  const spanDays = total / DAY_MS;

  let kind: TimelineKind;
  let firstTick: Date;
  let next: (d: Date) => Date;
  // Start of the period containing `d`; null for intraday (labels sit on ticks).
  let periodStart: ((d: Date) => Date) | null;
  // "boundary": label is a point-in-time, sits ON the tick. "centered": label
  // names a span (weekday, month), sits centred on the period.
  let labelMode: "boundary" | "centered";

  if (spanDays <= 2.05) {
    kind = "intraday";
    const h6 = Math.ceil((start.getHours() + 1) / 6) * 6;
    firstTick = new Date(startOfDay(start).getTime() + h6 * HOUR_MS);
    next = (d) => new Date(d.getTime() + 6 * HOUR_MS);
    periodStart = null;
    labelMode = "boundary";
  } else if (spanDays <= 14.05) {
    kind = "days";
    firstTick = addDays(startOfDay(start), 1);
    next = (d) => addDays(d, 1);
    periodStart = (d) => startOfDay(d);
    labelMode = "centered";
  } else if (spanDays <= 120.05) {
    kind = "weeks";
    firstTick = startOfISOWeek(addWeeks(start, 1));
    next = (d) => addWeeks(d, 1);
    periodStart = (d) => startOfISOWeek(d);
    labelMode = "boundary";
  } else {
    kind = "months";
    firstTick = startOfMonth(addMonths(start, 1));
    next = (d) => addMonths(d, 1);
    periodStart = (d) => startOfMonth(d);
    labelMode = "centered";
  }

  const thin = <T>(arr: T[]): T[] => {
    const stride = Math.max(1, Math.ceil(arr.length / maxTicks));
    return arr.filter((_, i) => i % stride === 0);
  };

  // Boundary ticks (gridlines).
  const allSeps: TimelineSeparator[] = [];
  for (let c = firstTick, g = 0; c.getTime() < end.getTime() && g < 500; g++) {
    const frac = (c.getTime() - start.getTime()) / total;
    if (frac > 0 && frac < 1) {
      allSeps.push({ frac, date: new Date(c) });
    }
    c = next(c);
  }
  const separators = thin(allSeps);

  let labels: TimelineSeparator[];
  if (labelMode === "boundary") {
    labels = separators;
  } else {
    // Period-name labels (weekday, month) centred on each COMPLETE period; a
    // period clipped by a window edge gets no label.
    const allLabels: TimelineSeparator[] = [];
    let p = periodStart!(start);
    for (let g = 0; p.getTime() < end.getTime() && g < 500; g++) {
      const pEndDate = next(p);
      // Complete = a visibility ratio (not strict pEnd <= end), so the last
      // period still counts when the window ends on its final millisecond
      // (e.g. a week ending Sun 23:59:59.999 vs the Mon 00:00 period end).
      const periodLen = pEndDate.getTime() - p.getTime() || 1;
      const visible =
        Math.min(pEndDate.getTime(), end.getTime()) -
        Math.max(p.getTime(), start.getTime());
      if (visible >= periodLen * 0.99) {
        const frac =
          ((p.getTime() + pEndDate.getTime()) / 2 - start.getTime()) / total;
        allLabels.push({ frac, date: new Date(p) });
      }
      p = pEndDate;
    }
    labels = thin(allLabels);
  }

  // Midnight gridlines, only when individual days read clearly.
  const dayBoundaries: number[] = [];
  if (spanDays > 1.05 && spanDays <= 40) {
    let day = addDays(startOfDay(start), 1);
    for (let g = 0; day.getTime() < end.getTime() && g < 64; g++) {
      const frac = (day.getTime() - start.getTime()) / total;
      if (frac > 0 && frac < 1) {
        dayBoundaries.push(frac);
      }
      day = addDays(day, 1);
    }
  }

  return { kind, start, end, separators, labels, dayBoundaries };
}

//Main card

@customElement("hui-energy-solar-overview-card")
export class HuiEnergySolarOverviewCard extends LitElement {
  // Geometry / render tunables live in constants.ts.

  @property({ attribute: false }) public hass!: any;
  @property({ attribute: false }) config!: SolarOverviewCardConfig;

  @state() _engine?: SolarOverviewEngine;
  @state() _now = new Date();
  // Screen-space layout of labels + leader lines, reprojected on every map
  // transform; null while the map is still loading.
  @state() _labelLayout: LabelLayout | null = null;
  // PV production: live value from hass.states.
  @state() _pvCurrent: number | null = null;
  @state() _pvUnit = "";
  _pvFetchKey = "";
  _pvFetching = false;
  // Recorder `change` series for the solar meter(s): reset-corrected,
  // unit-normalised kWh per bucket, the metric the HA Energy dashboard uses.
  @state() _pvChangeSeries: ChangeBucket[] | null = null;
  _pvChangeSeriesFetchKey = "";
  _pvChangeSeriesFetching = false;
  // HA Energy solar forecast, merged across config entries.
  @state() _haSolarForecast: SolarForecastPoint[] = [];
  _haSolarForecastLoaded = false;
  _haSolarForecastFetching = false;
  _haSolarForecastFetchedAt = 0;
  // Live home-battery readings. Units kept alongside so the chip formats
  // kW vs W without re-reading state.
  @state() _batterySoc: number | null = null;
  @state() _batteryPower: number | null = null;
  @state() _batteryPowerUnit = "";
  // Live grid import / export, unit captured alongside each value.
  @state() _gridImportValue: number | null = null;
  @state() _gridImportUnit = "";
  @state() _gridExportValue: number | null = null;
  @state() _gridExportUnit = "";
  // Recorder `change` series for grid import / export meters (see PV series).
  @state() _gridImportChangeSeries: ChangeBucket[] | null = null;
  @state() _gridExportChangeSeries: ChangeBucket[] | null = null;
  _gridImportChangeFetchKey = "";
  _gridExportChangeFetchKey = "";
  _gridImportChangeFetching = false;
  _gridExportChangeFetching = false;
  // Historical SoC (recorder long-term `mean`) driving the scrub-time SoC tooltip.
  @state() _batterySocHistory: {
    times: Date[];
    values: number[];
  } | null = null;
  _batteryFetchKey = "";
  _batteryFetching = false;
  // Recorder `change` series for battery charge + discharge meters. Net
  // (charge - discharge) gives a structural sign so charging is never lost (#216).
  @state() _batteryChargeChangeSeries: ChangeBucket[] | null = null;
  @state() _batteryDischargeChangeSeries: ChangeBucket[] | null = null;
  _batteryChangeFetchKey = "";
  _batteryChangeFetching = false;
  // Screen-space solar arc / sun / incidence ray, reprojected on every map
  // transform and clock tick (the sun moves with time).
  @state() _sunScene: SunScene | null = null;
  // Per-polygon home silhouettes (projected base + top ring of each polygon),
  // painted into the cloud-disc SVG mask. Reprojected on every map transform.
  @state() _homeSilhouettes: HomeSilhouette[] = [];

  // Energy dashboard prefs snapshot. Chip refreshers read their fallback entity
  // here when the configured slot is empty.
  @state() _energyDefaults: EnergyDefaults = EMPTY_ENERGY_DEFAULTS;
  // Identity of the last parsed `data.prefs`; the collection reuses the same
  // object across emits, so compare by reference to skip redundant reparses.
  private _lastParsedPrefs: unknown;
  // Memoised co2signal / Electricity Maps fossil-% entity, re-scanned only when
  // the registry identity changes.
  private _co2SignalEntity: string | null = null;
  private _co2EntitiesRef: unknown = undefined;
  // HA Energy daily-total cache from refreshHaDailyTotals(). Null until a stat is
  // configured and the recorder call lands; consumer chips collapse silently.
  @state() _haSolarTodayKwh: number | null = null;
  @state() _haGridImportTodayKwh: number | null = null;
  @state() _haGridExportTodayKwh: number | null = null;
  @state() _haBatteryChargedKwh: number | null = null;
  @state() _haBatteryDischargedKwh: number | null = null;
  @state() _homeHover = false;
  @state() _dashRadialHoverHour: number | null = null;
  // Not a @state on purpose: every wheel event mutates this and a @state would
  // re-render on every tick.
  _dashRadialWheelAcc = 0;
  @state() _chartHoverPct: number | null = null;
  @state() _timeRange: { start: Date; end: Date } | null = null;
  @state() _selectedTime: Date | null = null;
  @state() _isLiveMode = true;

  // Selected period mirrored from the Energy dashboard date picker via the energy
  // data collection. Null until the first update lands. Non-private so the scrub
  // fetches can read the picked window through their host interfaces.
  @state() _energyStart?: Date;
  @state() _energyEnd?: Date;
  private _energyCollectionUnsub?: () => void;
  // Solar production series (ms + kWh per bucket) over the selected window.
  @state() private _productionSeries: { t: number; v: number }[] = [];
  private _solarStatIds: string[] = [];
  // True while dragging the timeline, so the clock tick doesn't fight the cursor.
  private _timelineScrubbing = false;

  // Per-band visibility flags for the weather-mode cloud layer; gate the matching
  // shader band. Default all-on; reset on every mode entry.
  @state() _weatherShowHigh = true;
  @state() _weatherShowMid = true;
  @state() _weatherShowLow = true;

  // Flipped after the first prefs parse, so refreshHaDailyTotals fires immediately
  // instead of waiting for the 30 s tick.
  _energyDefaultsLoaded = false;
  private _dailyTotalsKicked = false;
  @state() _dashDayOffset = 0;
  _dashSwipeStartX: number | null = null;
  _dashSwipeStartTime = 0;
  @state() _dashAnimPhase: "idle" | "entering" | "exiting" = "idle";
  _dashAnimTimer?: number;
  @state() _dashViewMode: "radial" | "graph" = "radial";
  // Single source of truth for the card mode. Set imperatively by the
  // home-click / weather-return handlers; _handleCardModeChange in updated()
  // drives the side effects. Modes are mutually exclusive.
  @state() _cardMode: CardMode = "base";
  // True while chips / leaders / arcs / timeline are masked behind a non-base
  // mode. weather -> base lifts the mask immediately (faint raster).
  @state() _overlayMaskActive = false;

  // Lets the cloud-cover canvas keep painting through its exit fade after
  // _cardMode already left 'weather'. Cleared by the weather fade loop.
  _weatherOverlayVisible = false;
  _weatherFadeInStartMs: number | null = null;
  _weatherFadeOutStartMs: number | null = null;
  _weatherFadeRaf?: number;

  private _timer?: number;
  _lastHomeKey = "";
  _lastConfigSig = "";
  _initInflight = false;
  // Last engine spawn time; onContextLost bails when losses arrive < ~2 s apart
  // (browser thrashing the WebGL pool), since respawning just feeds the fire.
  _lastEngineSpawnAt = 0;

  // Cached theme polarity. The fallback probe forces a style flush, so cache it
  // on the themesObj identity and recompute lazily.
  private _cachedIsDarkThemesRef: unknown = undefined;
  private _cachedIsDark = false;

  // Refresh-chain gate: re-run the PV/Battery/Grid refreshers only when hass,
  // config or the time range change identity, so the chain doesn't re-run on
  // every overlay @state mutation during auto-rotate.
  private _lastRefreshHassRef: unknown = undefined;
  private _lastRefreshConfigRef: unknown = undefined;
  private _lastRefreshTimeRangeRef: unknown = undefined;
  private _lastRefreshEnergyDefaultsRef: unknown = undefined;

  // Arc-segment scratch buffers reused in place each render (below-horizon goes
  // behind the chips, above-horizon in front), avoiding a fresh filter() pair.
  private _arcBackBuf: ArcSegment[] = [];
  private _arcFrontBuf: ArcSegment[] = [];
  private _arcFrontNearBuf: ArcSegment[] = [];

  // Cached SVG point strings for the home silhouettes, keyed by reference on
  // host._homeSilhouettes so a fresh array rebuilds and reuse is free otherwise.
  private _silhouetteCacheKey: unknown = null;
  private _silhouettePtsCache: ({
    base: string;
    top: string;
    walls: string[];
  } | null)[] = [];

  //HA card lifecycle

  public setConfig(config: SolarOverviewCardConfig): void {
    if (!config) {
      throw new Error("Invalid solar overview card configuration");
    }
    this.config = { ...config };
  }

  // HA <hui-card-picker> signature. With a clicked zone entity, lift its lat/lon
  // into home-latitude / home-longitude; otherwise return an empty stub and fall
  // back to hass.config.latitude / longitude at runtime.
  static getStubConfig(
    hass?: {
      states?: Record<string, { attributes?: Record<string, unknown> }>;
    },
    entities?: string[]
  ): SolarOverviewCardConfig {
    if (hass && Array.isArray(entities) && entities.length > 0) {
      for (const entityId of entities) {
        if (typeof entityId !== "string" || !entityId.startsWith("zone.")) {
          continue;
        }
        const stateObj = hass.states?.[entityId];
        const lat = stateObj?.attributes?.latitude;
        const lon = stateObj?.attributes?.longitude;
        if (
          typeof lat === "number" &&
          Number.isFinite(lat) &&
          typeof lon === "number" &&
          Number.isFinite(lon)
        ) {
          return {
            "home-latitude": lat,
            "home-longitude": lon,
          };
        }
      }
    }
    return {};
  }

  // Masonry sizing: 1 unit = 50 px, so 15 ≈ 750 px (~480 px map once the
  // timeline takes ~150 px below).
  public getCardSize(): number {
    return 15;
  }

  // Sections sizing.
  public getGridOptions(): {
    rows: number;
    columns: number;
    min_rows: number;
    max_rows: number;
    min_columns: number;
    max_columns: number;
  } {
    return {
      rows: 8,
      columns: 36,
      min_rows: 6,
      max_rows: 24,
      min_columns: 12,
      max_columns: 36,
    };
  }

  // Last connect timestamp. The engine spawn defers past this so HA edit-mode
  // remounts (which rapidly destroy + recreate the card) don't allocate a fresh
  // WebGL context per transient mount and hit the browser's per-page WebGL cap.
  private _connectedAt = 0;
  // Deferred requestUpdate() handle for the connect-settle branch. MUST be cleared
  // in disconnectedCallback so an unmounted card can't re-spawn an engine.
  private _connectSettleTimer: number | undefined;

  public connectedCallback(): void {
    super.connectedCallback();
    this._connectedAt = performance.now();
    this._dailyTotalsKicked = false;
    tick(this);
    // 30 s tick: clock shows HH:MM, the sun moves ~0.13°/refresh (smooth). PV and
    // battery live readings update on hass state changes, not this tick.
    this._timer = window.setInterval(() => {
      tick(this);
      refreshHaDailyTotals(this);
    }, 30_000);
    initVisibilityObserver(this);
    if (typeof ResizeObserver !== "undefined") {
      this._resizeObserver = new ResizeObserver((entries) => {
        const w = entries[0]?.contentRect.width ?? 0;
        // Coarse threshold so a 1px jitter doesn't thrash the render loop.
        if (Math.abs(w - this._timelineWidth) > 8) {
          this._timelineWidth = w;
        }
      });
      this._resizeObserver.observe(this);
    }
    if (typeof document !== "undefined") {
      document.addEventListener(
        "visibilitychange",
        this._onPageVisibilityForTheme
      );
    }
    // The energy collection subscriber parses prefs into `_energyDefaults`; there
    // is no separate get_prefs fetch to wire here.
    this._subscribeEnergyCollection();
    // One-shot refresh so the headline lights up on first render; no-op when no
    // HA stat is wired.
    refreshHaDailyTotals(this);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._timer);
    this._visibilityObserver?.disconnect();
    this._visibilityObserver = undefined;
    this._resizeObserver?.disconnect();
    this._resizeObserver = undefined;
    if (this._onVisibilityChange) {
      document.removeEventListener(
        "visibilitychange",
        this._onVisibilityChange
      );
      this._onVisibilityChange = undefined;
    }
    if (typeof document !== "undefined") {
      document.removeEventListener(
        "visibilitychange",
        this._onPageVisibilityForTheme
      );
    }
    this._energyCollectionUnsub?.();
    this._energyCollectionUnsub = undefined;
    // The weather overlay fade self-resubmits via rAF and closes over `this`, so
    // cancel it or a detached card keeps calling requestUpdate().
    if (this._weatherFadeRaf !== undefined) {
      cancelAnimationFrame(this._weatherFadeRaf);
      this._weatherFadeRaf = undefined;
    }
    cancelPendingRespawn(this);
    if (this._connectSettleTimer !== undefined) {
      window.clearTimeout(this._connectSettleTimer);
      this._connectSettleTimer = undefined;
    }
    // HA's editor preview pane destroys + recreates this element on every
    // config-changed commit (hui-card.ts, no opt-out hook), so the engine is
    // reallocated per commit. The live dashboard tile is NOT recreated.
    if (this._engine !== undefined) {
      this._engine.cleanup();
      this._engine = undefined;
    }
    this._lastHomeKey = "";
    this._initInflight = false;
  }

  // Pauses the continuous SVG overlay animations when the card scrolls out of
  // the viewport. The engine's rotation rAF is left running (browser throttles
  // it on hidden tabs and the card looks alive on scroll-back).
  _visibilityObserver?: IntersectionObserver;
  @state() private _timelineWidth = 0;
  private _resizeObserver?: ResizeObserver;
  // Document-level visibilitychange listener; torn down in disconnectedCallback
  // so a removed card doesn't leak a global handler.
  _onVisibilityChange?: () => void;

  // Resolve + cache the co2signal entity off the registry, re-scanning only on
  // registry identity change. Done here (not render) to keep render side-effect free.
  protected willUpdate(_changedProperties: PropertyValues): void {
    if (this.hass?.entities !== this._co2EntitiesRef) {
      this._co2EntitiesRef = this.hass?.entities;
      this._co2SignalEntity = findCo2SignalEntity(this.hass);
    }
  }

  protected updated(_changedProperties: PropertyValues): void {
    // Mode-transition state machine: a single switch on _cardMode drives every
    // side effect (engine fades, overlay mask).
    if (_changedProperties.has("_cardMode")) {
      const prev =
        (_changedProperties.get("_cardMode") as CardMode | undefined) ?? "base";
      if (prev !== this._cardMode) {
        this._handleCardModeChange(prev, this._cardMode);
      }
    }

    // Weather mode: forward band-toggle + scrub changes to the shader layer.
    if (
      this._cardMode === "weather" &&
      (_changedProperties.has("_weatherShowLow") ||
        _changedProperties.has("_weatherShowMid") ||
        _changedProperties.has("_weatherShowHigh") ||
        _changedProperties.has("_selectedTime") ||
        _changedProperties.has("_isLiveMode"))
    ) {
      syncWeatherShaderState(this);
    }

    // Lazy Energy WS subscribe: hass can attach AFTER connectedCallback. The helper
    // self-guards on the unsub, so retrying here is safe.
    this._subscribeEnergyCollection();

    // Fire one immediate refreshHaDailyTotals the moment the prefs land (the
    // connect-time call was a no-op before then); flag prevents a second fire.
    if (this._energyDefaultsLoaded && !this._dailyTotalsKicked) {
      this._dailyTotalsKicked = true;
      refreshHaDailyTotals(this);
    }

    if (!this.hass?.config || !this.config) {
      return;
    }

    const coords = getHomeCoords(this.config, this.hass);
    if (!coords) {
      return;
    }

    const { lat, lon } = coords;

    const homeKey = `${lat.toFixed(5)},${lon.toFixed(5)}`;
    const identityChanged = homeKey !== this._lastHomeKey;

    if (!this._engine || identityChanged) {
      // Disconnected guard: HA's edit-mode wrapping fires disconnect + reconnect
      // in the same Lit tick, so an updated() pass can land on a detached element.
      if (!this.isConnected) {
        return;
      }
      if (this._initInflight) {
        return;
      }
      // Mount-debounce: edit-mode destroys + recreates the card several times in
      // the first few hundred ms. Defer the first engine spawn so a card that
      // unmounts within CONNECT_SETTLE_MS never allocates a WebGL context.
      const sinceConnect = performance.now() - this._connectedAt;
      const CONNECT_SETTLE_MS = 1000;
      if (sinceConnect < CONNECT_SETTLE_MS) {
        // Reuse a single deferred wake-up so rapid updates don't enqueue timers.
        if (this._connectSettleTimer !== undefined) {
          window.clearTimeout(this._connectSettleTimer);
        }
        this._connectSettleTimer = window.setTimeout(
          () => {
            this._connectSettleTimer = undefined;
            if (!this.isConnected) {
              return;
            }
            this.requestUpdate();
          },
          CONNECT_SETTLE_MS - sinceConnect + 16
        );
        return;
      }
      // Reset mode flags on identity change: _cardMode survives the engine
      // respawn but the engine's active flags reset, so a non-base mode at the
      // previous home would otherwise carry its chrome over to the new home.
      if (identityChanged) {
        this._cardMode = "base";
        this._overlayMaskActive = false;
        this._weatherOverlayVisible = false;
      }
      this._lastHomeKey = homeKey;
      this._lastConfigSig = computeConfigSig(this.config);
      initEngine(this);
      return;
    }

    // Identity stable: push config down only when the visual config changed,
    // else updateConfig() would rebuild the GeoJSON on every clock tick.
    const sig = computeConfigSig(this.config);
    if (sig !== this._lastConfigSig) {
      this._lastConfigSig = sig;
      this._engine.updateConfig(this.config);
    }

    // Refresh-chain gate (see the *Ref fields): skip when nothing the refreshers
    // depend on moved, so the chain doesn't re-run at 60+ Hz during auto-rotate.
    if (
      this.hass === this._lastRefreshHassRef &&
      this.config === this._lastRefreshConfigRef &&
      this._timeRange === this._lastRefreshTimeRangeRef &&
      this._energyDefaults === this._lastRefreshEnergyDefaultsRef
    ) {
      return;
    }
    this._lastRefreshHassRef = this.hass;
    this._lastRefreshConfigRef = this.config;
    this._lastRefreshTimeRangeRef = this._timeRange;
    this._lastRefreshEnergyDefaultsRef = this._energyDefaults;

    refreshPv(this);
    refreshBattery(this);
    refreshGrid(this);
    // Solar forecast (energy/solar_forecast). Defensive; empty when no source.
    fetchHaSolarForecast(this);
  }

  // Drop the cached theme probe when the tab returns to foreground: HA can push
  // a hass with stale themes for one frame after resume, leaving the card on its
  // previous polarity otherwise.
  private _onPageVisibilityForTheme = (): void => {
    if (
      typeof document !== "undefined" &&
      document.visibilityState === "visible"
    ) {
      this._cachedIsDarkThemesRef = undefined;
      this.requestUpdate();
    }
  };

  // Resolve theme polarity. Authoritative source is hass.themes.darkMode; the
  // getComputedStyle fallback covers older builds + custom themes and is the only
  // path cached. setCardThemeIsDark runs every call to keep the engine in sync.
  private _resolveIsDark(
    themesObj: { darkMode?: boolean } | undefined
  ): boolean {
    let isDark: boolean;
    if (themesObj && typeof themesObj.darkMode === "boolean") {
      isDark = themesObj.darkMode;
    } else if (this._cachedIsDarkThemesRef === themesObj) {
      isDark = this._cachedIsDark;
    } else {
      isDark = this._probeIsDarkFromCss();
      this._cachedIsDarkThemesRef = themesObj;
      this._cachedIsDark = isDark;
    }
    this._engine?.setCardThemeIsDark(isDark);
    return isDark;
  }

  // Fallback luminance probe off --primary-background-color. Costly (forces a
  // style recompute), so only reached when hass.themes.darkMode is undefined.
  private _probeIsDarkFromCss(): boolean {
    try {
      const bg = getComputedStyle(this)
        .getPropertyValue("--primary-background-color")
        .trim();
      if (!bg) {
        return false;
      }
      const hexMatch = bg.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
      let r = 0;
      let g = 0;
      let b = 0;
      if (hexMatch) {
        const hex =
          hexMatch[1].length === 3
            ? hexMatch[1]
                .split("")
                .map((c) => c + c)
                .join("")
            : hexMatch[1];
        r = parseInt(hex.slice(0, 2), 16);
        g = parseInt(hex.slice(2, 4), 16);
        b = parseInt(hex.slice(4, 6), 16);
      } else {
        const rgbMatch = bg.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
        if (rgbMatch) {
          r = +rgbMatch[1];
          g = +rgbMatch[2];
          b = +rgbMatch[3];
        }
      }
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return lum < 0.5;
    } catch (_) {
      /* best-effort: colour luminance parse */
    }
    return false;
  }

  // Nudge a leader endpoint to the border of the central home pill, so all chip
  // leaders dock against a single focal energy node.
  private _nudgeToHomeCircle(
    chipX: number,
    chipY: number,
    homeX: number,
    homeY: number
  ): { x: number; y: number } {
    const dx = chipX - homeX;
    const dy = chipY - homeY;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    return {
      x: homeX + (dx / len) * HOME_PILL_RADIUS_PX,
      y: homeY + (dy / len) * HOME_PILL_RADIUS_PX,
    };
  }

  // Build (or return cached) SVG point strings for the home silhouette layer,
  // keyed by _homeSilhouettes identity.
  private _getSilhouettePoints(): ({
    base: string;
    top: string;
    walls: string[];
  } | null)[] {
    const sils = this._homeSilhouettes;
    if (this._silhouetteCacheKey === sils) {
      return this._silhouettePtsCache;
    }

    const out: ({ base: string; top: string; walls: string[] } | null)[] = [];
    for (const sil of sils) {
      const N = Math.min(sil.base.length, sil.top.length);
      if (N < 3) {
        out.push(null);
        continue;
      }
      let basePts = "";
      let topPts = "";
      for (let i = 0; i < N; i++) {
        if (i > 0) {
          basePts += " ";
          topPts += " ";
        }
        basePts += sil.base[i].x + "," + sil.base[i].y;
        topPts += sil.top[i].x + "," + sil.top[i].y;
      }
      const walls: string[] = new Array(N);
      for (let i = 0; i < N; i++) {
        const j = (i + 1) % N;
        walls[i] =
          sil.base[i].x +
          "," +
          sil.base[i].y +
          " " +
          sil.base[j].x +
          "," +
          sil.base[j].y +
          " " +
          sil.top[j].x +
          "," +
          sil.top[j].y +
          " " +
          sil.top[i].x +
          "," +
          sil.top[i].y;
      }
      out.push({ base: basePts, top: topPts, walls });
    }
    this._silhouetteCacheKey = sils;
    this._silhouettePtsCache = out;
    return out;
  }

  //Render

  protected render(): TemplateResult {
    // Home coordinates resolved (HA config or card-level override)? Required to
    // project the home onto the map.
    const hasHomeCoords = getHomeCoords(this.config, this.hass) !== null;

    // Pre-projected label + leader anchors; null until the map is ready.
    const layout = this._labelLayout;

    const pvEntityId = resolvePvLiveEntity(this._energyDefaults);
    // Literal hex fallback so inline SVG attrs (which can't resolve a bare CSS
    // var) stay in sync with the stylesheet rules using the same token.
    const pvColor = "var(--energy-solar-color, #ff9800)";
    // Past scrub reflects what PV produced at that instant; future scrub has no
    // data, so the chip hides rather than showing a fake number.
    const pvScrubbing = !this._isLiveMode && this._selectedTime !== null;
    const pvScrubFuture =
      pvScrubbing && this._selectedTime!.getTime() > Date.now() + 60_000;

    // Instantaneous production at the active instant (live now, or the scrub
    // target); never the lifetime cumulative total.
    const pvRate =
      pvEntityId !== "" && layout !== null
        ? pvScrubbing
          ? (pvRateAtTime(this, this._selectedTime!) ??
            // The live-edge 5-minute bucket isn't committed yet, so the history
            // lookup returns null; fall back to the live reading near "now".
            (this._selectedTime!.getTime() >= Date.now() - 6 * 60_000 &&
            this._pvCurrent !== null
              ? currentPvRate(this)
              : null))
          : this._pvCurrent !== null
            ? currentPvRate(this)
            : null
        : null;

    // Predicted PV for a future scrub: the same forecast series the dotted
    // timeline curve draws, so the chip never disagrees with the line it sits on.
    let pvPredictedRate: { value: number; unit: string } | null = null;
    if (
      pvScrubFuture &&
      pvEntityId !== "" &&
      layout !== null &&
      this._haSolarForecast.length > 0
    ) {
      const w = forecastWattsAt(
        this._haSolarForecast,
        this._selectedTime!.getTime()
      );
      if (w !== null && w > 0) {
        pvPredictedRate = { value: w, unit: "W" };
      }
    }

    const isPvPredicted = pvScrubFuture && pvPredictedRate !== null;
    const pvActiveRate = isPvPredicted ? pvPredictedRate : pvRate;

    const showPvLabel =
      hasHomeCoords &&
      layout !== null &&
      pvEntityId !== "" &&
      pvActiveRate !== null &&
      (!pvScrubFuture || isPvPredicted);

    const valueDec = VALUE_DECIMALS;
    const pvDisplayValue = showPvLabel
      ? (isPvPredicted ? "≈ " : "") +
        formatPvValue(
          this.hass,
          pvActiveRate!.value,
          pvActiveRate!.unit,
          valueDec
        )
      : "";

    // PV → home leader flow speed saturates at a fixed 5 kW reference (typical
    // residential peak); idle (no flow/arrow) when production is zero or negative.
    const pvWattsNow =
      pvRate !== null ? pvNormalizeToWatts(pvRate.value, pvRate.unit) : 0;
    const pvPeakRefW = 5000;
    const pvFlowDuration = flowDuration(pvWattsNow, pvPeakRefW, 0.5);
    const pvIdle = !(pvWattsNow > 0);
    // Battery chips flank the PV chip (SoC left, signed Power right). Scrub
    // semantics mirror PV. Eligibility off the HA Energy defaults: a SoC source
    // lights the SoC chip, a power source the Power chip; they render independently.
    const batteryEntities = resolveBatteryEntities(this._energyDefaults);
    const hasAnyBankSoc = batteryEntities.socEntity !== null;
    const hasAnyBankPower = batteryEntities.powerEntity !== null;
    const batteryScrubbing = !this._isLiveMode && this._selectedTime !== null;
    const batteryScrubFuture =
      batteryScrubbing && this._selectedTime!.getTime() > Date.now() + 60_000;

    // Grid IN/OUT past-scrub: average watts at the scrub instant from the `change`
    // series. Null in future scrub (no data) and live mode (live values already set).
    const gridScrubTimeMs =
      batteryScrubbing && !batteryScrubFuture
        ? this._selectedTime!.getTime()
        : null;
    const rawImport =
      gridScrubTimeMs !== null
        ? wattsAtFromChangeSeries(this._gridImportChangeSeries, gridScrubTimeMs)
        : this._gridImportValue;
    const rawExport =
      gridScrubTimeMs !== null
        ? wattsAtFromChangeSeries(this._gridExportChangeSeries, gridScrubTimeMs)
        : this._gridExportValue;
    const gridImportDisplayWatts =
      rawImport === null ? null : Math.max(0, rawImport);
    const gridExportDisplayWatts =
      rawExport === null ? null : Math.max(0, rawExport);
    const gridImportDisplayUnit =
      gridScrubTimeMs !== null ? "W" : this._gridImportUnit;
    const gridExportDisplayUnit =
      gridScrubTimeMs !== null ? "W" : this._gridExportUnit;

    // Active SoC / power: historical samples in scrub mode, live state otherwise.
    const activeBatterySoc: number | null = batteryScrubbing
      ? batterySampleAtTime(this._batterySocHistory, this._selectedTime!)
      : this._batterySoc;
    // Battery power scrub: net the charge/discharge series (charge - discharge);
    // live mode reads the live signed value.
    let activeBatteryPower: number | null;
    if (batteryScrubbing) {
      const tMs = this._selectedTime!.getTime();
      const c = wattsAtFromChangeSeries(this._batteryChargeChangeSeries, tMs);
      const d = wattsAtFromChangeSeries(
        this._batteryDischargeChangeSeries,
        tMs
      );
      activeBatteryPower =
        c === null && d === null
          ? null
          : Math.max(0, c ?? 0) - Math.max(0, d ?? 0);
    } else {
      activeBatteryPower = this._batteryPower;
    }
    const activeBatteryUnit = batteryScrubbing ? "W" : this._batteryPowerUnit;

    const showSocChip =
      hasHomeCoords &&
      layout !== null &&
      !batteryScrubFuture &&
      hasAnyBankSoc &&
      activeBatterySoc !== null;
    const showPowerChip =
      hasHomeCoords &&
      layout !== null &&
      !batteryScrubFuture &&
      hasAnyBankPower &&
      activeBatteryPower !== null;

    const batterySocText = showSocChip
      ? `${Math.round(activeBatterySoc!)} %`
      : "";
    // HA "Power sources" sign convention: discharge positive, charge negative.
    // activeBatteryPower is physical charge-positive, so it is negated for the
    // text only; colour + leader direction below stay on the physical sign.
    const batteryPowerText = showPowerChip
      ? formatBatteryPower(
          this.hass,
          -activeBatteryPower!,
          activeBatteryUnit,
          valueDec
        )
      : "";

    // Home consumption, same formula as the official "Now" Power usage header:
    //   used_total = from_grid + solar + from_battery - to_grid - to_battery
    // over the card's scrub-aware per-family values. Families contribute only when
    // they have a reading; clamped at zero (small negatives are meter skew).
    const usagePvW =
      !pvScrubFuture && pvActiveRate !== null
        ? pvNormalizeToWatts(pvActiveRate.value, pvActiveRate.unit)
        : null;
    const usageGridW =
      gridImportDisplayWatts !== null || gridExportDisplayWatts !== null
        ? (gridImportDisplayWatts ?? 0) - (gridExportDisplayWatts ?? 0)
        : null;
    // Charge-positive, so it SUBTRACTS: charging is consumption that never
    // reaches the home, discharging (negative) adds supply.
    const usageBatteryW = showPowerChip ? activeBatteryPower! : null;
    const homeUsageWatts =
      usagePvW === null && usageGridW === null && usageBatteryW === null
        ? null
        : Math.max(
            0,
            (usagePvW ?? 0) + (usageGridW ?? 0) - (usageBatteryW ?? 0)
          );
    const showHomeUsageChip =
      hasHomeCoords &&
      layout !== null &&
      !batteryScrubFuture &&
      homeUsageWatts !== null;
    const homeUsageText = showHomeUsageChip
      ? formatGridValue(this.hass, homeUsageWatts, "W", valueDec)
      : "";

    // Leader direction + colour track the PHYSICAL sign (positive = charging,
    // arrow flows PV → Power into the battery), independent of the HA-sign flip
    // on the chip text. Flow speed saturates at the same ~5 kW as the PV leader.
    const batteryCharging = showPowerChip && activeBatteryPower! > 0;
    const batteryLeaderColor = batteryCharging
      ? "var(--energy-battery-in-color, #f06292)"
      : "var(--energy-battery-out-color, #4db6ac)";
    const batteryWattsForFlow = showPowerChip
      ? Math.abs(pvNormalizeToWatts(activeBatteryPower!, activeBatteryUnit))
      : 0;
    // Idle within sensor-noise margin (±5 W): leader still drawn, but flow frozen
    // and arrow hidden so no misleading motion.
    const batteryIdle = showPowerChip && batteryWattsForFlow < 5;
    const batteryFlowDuration = flowDuration(batteryWattsForFlow, 5000);

    // PV_HALF_HEIGHT_PX places the vertical leg's top flush against PV's bottom edge.
    const PV_HALF_HEIGHT_PX = 11;
    // Half-width sized to the NARROWEST realistic PV text ("0 W"), so the solar-ray
    // snap point lands at-or-before the chip border and never overshoots.
    const PV_HALF_WIDTH_PX = 28;
    // Build a rounded L from the chip edge (nudged by chipNudgePx along the home
    // direction) to the home pill border: horizontal leg, fillet, vertical leg.
    const buildLPathToHome = (
      chipX: number,
      chipY: number,
      chipNudgePx: number
    ): string => {
      if (!layout) {
        return "";
      }
      const homeX = layout.home.x;
      const homeY = layout.home.y;
      const dirH = homeX > chipX ? 1 : -1;
      const dirV = homeY > chipY ? 1 : -1;
      const sx = chipX + dirH * chipNudgePx;
      const sy = chipY;
      // Land the vertical leg ~25% of the pill width off-centre so two leaders on
      // the same row don't collide on the central axis.
      const HOME_PILL_VISIBLE_RADIUS = 26;
      const HOME_PILL_QUARTER_X = 13;
      const ex = homeX - dirH * HOME_PILL_QUARTER_X;
      // Vertical leg crosses the pill outline at y = home.y ± sqrt(R² - offsetX²).
      const yIntersect = Math.sqrt(
        Math.max(
          0,
          HOME_PILL_VISIBLE_RADIUS * HOME_PILL_VISIBLE_RADIUS -
            HOME_PILL_QUARTER_X * HOME_PILL_QUARTER_X
        )
      );
      const ey = homeY - dirV * yIntersect;
      // Fillet radius, clamped to fit inside both legs of the L.
      const FILLET_R = 12;
      const r = Math.min(
        FILLET_R,
        Math.abs(ex - sx) / 2,
        Math.abs(ey - sy) / 2
      );
      const preX = ex - dirH * r;
      const postY = sy + dirV * r;
      return `M ${sx.toFixed(1)},${sy.toFixed(1)} L ${preX.toFixed(1)},${sy.toFixed(1)} Q ${ex.toFixed(1)},${sy.toFixed(1)} ${ex.toFixed(1)},${postY.toFixed(1)} L ${ex.toFixed(1)},${ey.toFixed(1)}`;
    };
    const socLeaderPath = buildLPathToHome(
      layout?.batterySocLabel.x ?? 0,
      layout?.batterySocLabel.y ?? 0,
      22
    );
    const powerLeaderPath = buildLPathToHome(
      layout?.batteryPowerLabel.x ?? 0,
      layout?.batteryPowerLabel.y ?? 0,
      22
    );
    const powerArrowPath = powerLeaderPath;
    const gridLeaderPath = buildLPathToHome(
      layout?.gridLabel.x ?? 0,
      layout?.gridLabel.y ?? 0,
      22
    );

    // Grid bead cadence: dur = MIN_DUR * CAP / watts, so bead frequency tracks
    // power linearly (MIN_DUR at the cap, 2x at half, clamped to MAX_DUR). Below
    // ~5 W the bead is dropped (recorder noise). Caps are round residential
    // thresholds (5 kW import, 1 kW export surplus).
    const GRID_BEAD_IMPORT_CAP_W = 5000;
    const GRID_BEAD_EXPORT_CAP_W = 1000;
    const GRID_BEAD_MIN_DUR_S = 1.2;
    const GRID_BEAD_MAX_DUR_S = 8.0;
    const GRID_BEAD_IDLE_W = 5;
    const importWattsAbs =
      this._gridImportValue !== null
        ? Math.abs(
            pvNormalizeToWatts(this._gridImportValue, this._gridImportUnit)
          )
        : 0;
    const exportWattsAbs =
      this._gridExportValue !== null
        ? Math.abs(
            pvNormalizeToWatts(this._gridExportValue, this._gridExportUnit)
          )
        : 0;
    const proportionalBeadDur = (watts: number, capW: number): number => {
      const w = Math.max(watts, 1);
      return Math.min(
        GRID_BEAD_MAX_DUR_S,
        Math.max(GRID_BEAD_MIN_DUR_S, (GRID_BEAD_MIN_DUR_S * capW) / w)
      );
    };
    const gridImportBeadDur =
      importWattsAbs < GRID_BEAD_IDLE_W
        ? null
        : proportionalBeadDur(importWattsAbs, GRID_BEAD_IMPORT_CAP_W);
    const gridExportBeadDur =
      exportWattsAbs < GRID_BEAD_IDLE_W
        ? null
        : proportionalBeadDur(exportWattsAbs, GRID_BEAD_EXPORT_CAP_W);
    // Single grid chip shows the ACTIVE flow only; the larger display value wins
    // (drives colour, value, icon, bead direction). Ties fall to import.
    const gridImporting =
      (gridImportDisplayWatts ?? 0) >= (gridExportDisplayWatts ?? 0);
    const gridLeaderColor = gridImporting
      ? "var(--energy-grid-consumption-color, #488fc2)"
      : "var(--energy-grid-return-color, #8353d1)";
    // Bead cadence from the active side; null (no bead) below the idle threshold.
    const gridBeadDur = gridImporting ? gridImportBeadDur : gridExportBeadDur;

    // Low-carbon inflow: co2signal reports the grid fossil %, so low-carbon power
    // is import * (100 - fossil)/100. Only exists while importing, so the chip
    // hides on export, idle, or when co2signal isn't wired. (entity cached in willUpdate.)
    const co2Entity = this._co2SignalEntity;
    const fossilRaw = co2Entity
      ? this.hass?.states?.[co2Entity]?.state
      : undefined;
    const fossilPct =
      fossilRaw !== undefined && fossilRaw !== null
        ? parseFloat(String(fossilRaw))
        : NaN;
    const lowCarbonShare = Number.isFinite(fossilPct)
      ? Math.max(0, Math.min(1, 1 - fossilPct / 100))
      : null;
    const lowCarbonWatts =
      lowCarbonShare !== null &&
      gridImporting &&
      gridImportDisplayWatts !== null &&
      gridImportDisplayWatts > 0
        ? gridImportDisplayWatts * lowCarbonShare
        : null;
    const showLowCarbon =
      hasHomeCoords &&
      layout !== null &&
      !batteryScrubFuture &&
      lowCarbonWatts !== null;
    // Straight vertical leader from the low-carbon chip down into the grid chip
    // below it; each end nudged ~16 px so the line meets the pill edges.
    const lowCarbonLeaderPath = layout
      ? `M ${layout.lowCarbonLabel.x.toFixed(1)},${(layout.lowCarbonLabel.y + 16).toFixed(1)} L ${layout.gridLabel.x.toFixed(1)},${(layout.gridLabel.y - 16).toFixed(1)}`
      : "";
    const lowCarbonBeadDur =
      lowCarbonWatts === null || lowCarbonWatts < GRID_BEAD_IDLE_W
        ? null
        : proportionalBeadDur(lowCarbonWatts, GRID_BEAD_IMPORT_CAP_W);
    const lowCarbonColor = "var(--energy-non-fossil-color, #0f9d58)";

    // Solar-arc overlay (sun trajectory + position + incidence ray), pre-projected
    // by the engine. Hidden until the engine is ready.
    const sunScene = this._sunScene;
    const showSun =
      hasHomeCoords && sunScene !== null && sunScene.arc.length >= 2;

    const sunColor = DEFAULT_SUN_COLOR_HEX;
    const sunRimColor = darkenHex(sunColor, 0.2);
    const arcSegments = showSun
      ? buildArcSegments(sunScene!.arc, sunColor)
      : [];
    // Z-order split (single pass into reused scratch buffers): below-horizon
    // renders behind the chip cluster, above-horizon in front.
    const arcSegmentsBack = this._arcBackBuf;
    const arcSegmentsFrontFar = this._arcFrontBuf;
    const arcSegmentsFrontNear = this._arcFrontNearBuf;
    arcSegmentsBack.length = 0;
    arcSegmentsFrontFar.length = 0;
    arcSegmentsFrontNear.length = 0;
    // Above-horizon segments split again by camera nearness (>= 0.5 midpoint):
    // the near half renders above the chips, the far half behind them.
    for (const s of arcSegments) {
      if (s.belowHorizon) {
        arcSegmentsBack.push(s);
      } else if (s.nearness >= 0.5) {
        arcSegmentsFrontNear.push(s);
      } else {
        arcSegmentsFrontFar.push(s);
      }
    }

    // Incidence ray renders when the sun is above the horizon. Points at the PV
    // chip when shown, else docks on the home pill (sun -> home).
    const showRay = showSun && sunScene!.sun.altitude > 0;

    // Live irradiance for the W/m² label and the inner-disc fill ratio (full rim
    // at STC 1000 W/m²). Square-root mapping linearises AREA perception (area ∝ r²).
    const sunWm2 = sunScene?.sun.irradiance ?? 0;
    const sunWm2Round = Math.round(sunWm2);
    const sunFillRatio = Math.sqrt(Math.max(0, Math.min(1, sunWm2 / 1000)));
    const showSunLabel = showSun && sunScene!.sun.altitude > 0;
    // Sun-ray flow on the same scale as the PV leader, saturating at 1000 W/m²;
    // kept a touch slower (0.8 s) since the ray spans the whole card.
    const sunFlowDuration = flowDuration(sunWm2, 1000, 0.8);

    // Anchor the sun ray to the NEAREST point of the PV chip's pill outline so it
    // glides along the border as the sun arcs, instead of snapping to four spots.
    let sunRayTargetX = sunScene?.home.x ?? 0;
    let sunRayTargetY = sunScene?.home.y ?? 0;
    if (layout && sunScene && !showPvLabel) {
      // PV chip hidden: dock the ray on the home pill facing the sun (sun -> home).
      const docked = this._nudgeToHomeCircle(
        sunScene.sun.x,
        sunScene.sun.y,
        layout.home.x,
        layout.home.y
      );
      sunRayTargetX = docked.x;
      sunRayTargetY = docked.y;
    } else if (layout && sunScene && pvEntityId) {
      const cx = layout.pvLabel.x;
      const cy = layout.pvLabel.y;
      const halfW = PV_HALF_WIDTH_PX;
      const halfH = PV_HALF_HEIGHT_PX;
      const ex = sunScene.sun.x - cx;
      const ey = sunScene.sun.y - cy;
      // Width of the pill's straight middle (between the end-cap semicircles).
      const straightHalfW = Math.max(0, halfW - halfH);

      if (Math.abs(ex) <= straightHalfW) {
        // Sun over the straight middle: nearest point is the top/bottom edge.
        sunRayTargetX = sunScene.sun.x;
        sunRayTargetY = cy + (ey >= 0 ? 1 : -1) * halfH;
      } else {
        // Sun over a rounded end: nearest point is on the matching end-cap arc.
        const cornerX = cx + (ex >= 0 ? 1 : -1) * straightHalfW;
        const cornerY = cy;
        const dx = sunScene.sun.x - cornerX;
        const dy = sunScene.sun.y - cornerY;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        sunRayTargetX = cornerX + (halfH * dx) / dist;
        sunRayTargetY = cornerY + (halfH * dy) / dist;
      }
    }

    const themesObj = (
      this.hass as { themes?: { darkMode?: boolean } } | undefined
    )?.themes;
    const isDark = this._resolveIsDark(themesObj);
    const cardThemeClass = isDark ? "theme-dark" : "theme-light";

    // ha-card classes: theme + mode-* + overlay-masked (chip/leader/arc/timeline
    // hide). In weather mode the timeline stays visible (CSS mode-weather exception)
    // so the user can scrub and the overlay tracks the cursor.
    const overlayMasked = this._overlayMaskActive;
    // camera-locked swaps the MapLibre grab cursor for the default arrow when pan
    // + rotate are disabled.
    const cameraLocked = this._isCameraLocked();
    const cardClasses = [
      cardThemeClass,
      `mode-${this._cardMode}`,
      overlayMasked ? "overlay-masked" : "",
      cameraLocked ? "camera-locked" : "",
    ]
      .filter(Boolean)
      .join(" ");

    return html`
      <ha-card class=${cardClasses}>
        <div id="map-container"></div>

        <div class="header">
          ${this._renderTitle()} ${this._renderTimeChip()}
        </div>

        <!-- Weather mode: glowing disc replaces the home pill; click returns to base. -->
        ${this._cardMode === "weather"
          ? html`<button
              class="weather-home"
              aria-label="Back to overview"
              @click=${this._onWeatherHomeReturn}
            >
              <ha-icon icon="mdi:home"></ha-icon>
            </button>`
          : nothing}

        <!-- Weather mode: segmented control toggling the low / mid / high cloud layers. -->
        ${this._cardMode === "weather"
          ? html`<div
              class="cloud-bands"
              role="group"
              aria-label="Cloud layers"
            >
              <button
                class="cloud-band ${this._weatherShowLow ? "is-on" : ""}"
                aria-pressed=${this._weatherShowLow}
                data-band="low"
                @click=${this._onCloudBandClick}
              >
                ${this._cloudBandLabel("low")}
              </button>
              <button
                class="cloud-band ${this._weatherShowMid ? "is-on" : ""}"
                aria-pressed=${this._weatherShowMid}
                data-band="mid"
                @click=${this._onCloudBandClick}
              >
                ${this._cloudBandLabel("mid")}
              </button>
              <button
                class="cloud-band ${this._weatherShowHigh ? "is-on" : ""}"
                aria-pressed=${this._weatherShowHigh}
                data-band="high"
                @click=${this._onCloudBandClick}
              >
                ${this._cloudBandLabel("high")}
              </button>
            </div>`
          : nothing}

        <!-- Solar arc, BACK pass: dotted below-horizon segments, behind the chips. -->
        ${showSun && arcSegmentsBack.length > 0
          ? html`
              <svg
                class="solar-svg solar-svg-back"
                style="--solar-daylight:${sunScene!.daylight}"
              >
                ${arcSegmentsBack.map(
                  (s) => svg`
                            <line
                                class="solar-arc-outline solar-arc-night"
                                x1="${s.x1}" y1="${s.y1}"
                                x2="${s.x2}" y2="${s.y2}"
                                stroke-width="${
                                  (OUTLINE_FAR +
                                    (OUTLINE_NEAR - OUTLINE_FAR) * s.nearness) *
                                  NIGHT_STROKE_FACTOR
                                }"
                            ></line>
                        `
                )}
                ${arcSegmentsBack.map(
                  (s) => svg`
                            <line
                                class="solar-arc-segment solar-arc-night"
                                x1="${s.x1}" y1="${s.y1}"
                                x2="${s.x2}" y2="${s.y2}"
                                stroke="${s.color}"
                                stroke-width="${
                                  (SEGMENT_FAR +
                                    (SEGMENT_NEAR - SEGMENT_FAR) * s.nearness) *
                                  NIGHT_STROKE_FACTOR
                                }"
                            ></line>
                        `
                )}
              </svg>
            `
          : nothing}

        <!-- PV → home animated leader: vertical dashed line flowing toward the
             home at a pace proportional to live production. Hidden when no PV. -->
        ${nothing}
        ${showPvLabel
          ? (() => {
              // Leader stops at the home disc border via a fixed radius nudge.
              const pvX1 = layout!.pvLabel.x;
              const pvY1 = layout!.pvLabel.y + PV_HALF_HEIGHT_PX;
              const pvHomeEnd = this._nudgeToHomeCircle(
                pvX1,
                pvY1,
                layout!.home.x,
                layout!.home.y
              );
              return html` <svg class="pv-home-leader-svg">
                <line
                  class="pv-home-leader-line"
                  style="--pv-leader-color:${pvColor}"
                  x1=${pvX1}
                  y1=${pvY1}
                  x2=${pvHomeEnd.x}
                  y2=${pvHomeEnd.y}
                ></line>
                ${!pvIdle
                  ? svg`
                            <!-- Bead riding the leader at a speed proportional to production. -->
                            <circle
                                class="pv-home-leader-bead"
                                r="3"
                                fill="${pvColor}"
                            >
                                <animateMotion
                                    dur="${pvFlowDuration}s"
                                    repeatCount="indefinite"
                                    path="M ${pvX1},${pvY1} L ${pvHomeEnd.x},${pvHomeEnd.y}"
                                ></animateMotion>
                            </circle>
                        `
                  : nothing}
              </svg>`;
            })()
          : nothing}
        ${showPvLabel
          ? html`
              <div
                class="pv-pct-label ${isPvPredicted ? "is-predicted" : ""}"
                style="left:${layout!.pvLabel.x}px; top:${layout!.pvLabel
                  .y}px; --pv-leader-color:${pvColor}"
              >
                <ha-icon icon="mdi:solar-power"></ha-icon>
                <span>${pvDisplayValue}</span>
              </div>
            `
          : nothing}
        ${showSocChip || showPowerChip
          ? html`
              <svg class="battery-leader-svg">
                <!-- SoC ↔ PV: static L-path (SoC is a level, not a flow). -->
                ${showSocChip
                  ? svg`
                            <path
                                class="battery-leader-line"
                                style="--battery-leader-color:${batteryLeaderColor}"
                                d="${socLeaderPath}"
                            ></path>
                        `
                  : nothing}
                <!-- PV ↔ Power: L-path with a bead at a speed proportional to |P|. -->
                ${showPowerChip
                  ? svg`
                            <path
                                class="battery-leader-line"
                                style="--battery-leader-color:${batteryLeaderColor}"
                                d="${powerLeaderPath}"
                            ></path>
                            ${
                              !batteryIdle
                                ? svg`
                                <circle
                                    class="battery-leader-bead"
                                    r="3"
                                    style="fill:${batteryLeaderColor}"
                                >
                                    <animateMotion
                                        dur="${batteryFlowDuration}s"
                                        repeatCount="indefinite"
                                        path="${powerArrowPath}"
                                    ></animateMotion>
                                </circle>
                            `
                                : nothing
                            }
                        `
                  : nothing}
              </svg>
              ${showSocChip
                ? html`
                    <div
                      class="battery-pct-label"
                      style="left:${layout!.batterySocLabel.x}px; top:${layout!
                        .batterySocLabel
                        .y}px; --battery-leader-color:${batteryLeaderColor}"
                    >
                      <ha-icon icon="mdi:battery"></ha-icon>
                      <span>${batterySocText}</span>
                    </div>
                  `
                : nothing}
              ${showPowerChip
                ? html`
                    <div
                      class="battery-pct-label"
                      style="left:${layout!.batteryPowerLabel
                        .x}px; top:${layout!.batteryPowerLabel
                        .y}px; --battery-leader-color:${batteryLeaderColor}"
                    >
                      <ha-icon icon="mdi:lightning-bolt"></ha-icon>
                      <span>${batteryPowerText}</span>
                    </div>
                  `
                : nothing}
            `
          : nothing}

        <!-- Grid chip (LEFT): single pill showing the ACTIVE flow only — import
             reads consumption blue (grid → home bead), export return purple. -->
        ${hasHomeCoords &&
        layout !== null &&
        (gridImportDisplayWatts !== null || gridExportDisplayWatts !== null) &&
        !batteryScrubFuture
          ? html`
              <svg class="grid-leader-svg">
                <path
                  class="grid-leader-line"
                  style="stroke:${gridLeaderColor}"
                  d=${gridLeaderPath}
                />
                <!-- Bead on the active flow: import grid → home, export reversed
                     via keyPoints 1;0. Dropped when the active side is idle. -->
                ${gridBeadDur !== null
                  ? gridImporting
                    ? svg`
                            <circle class="grid-leader-bead" r="3" style="fill:${gridLeaderColor}">
                                <animateMotion dur="${gridBeadDur.toFixed(2)}s" repeatCount="indefinite"
                                               path="${gridLeaderPath}" />
                            </circle>
                        `
                    : svg`
                            <circle class="grid-leader-bead" r="3" style="fill:${gridLeaderColor}">
                                <animateMotion dur="${gridBeadDur.toFixed(2)}s" repeatCount="indefinite"
                                               keyPoints="1;0" keyTimes="0;1"
                                               path="${gridLeaderPath}" />
                            </circle>
                        `
                  : nothing}
              </svg>
              <div
                class="grid-label"
                style="left:${layout!.gridLabel.x}px; top:${layout!.gridLabel
                  .y}px; --grid-leader-color:${gridLeaderColor}"
              >
                <ha-icon
                  icon=${gridImporting
                    ? "mdi:transmission-tower-export"
                    : "mdi:transmission-tower-import"}
                ></ha-icon>
                <span
                  >${formatGridValue(
                    this.hass,
                    gridImporting
                      ? (gridImportDisplayWatts ?? 0)
                      : (gridExportDisplayWatts ?? 0),
                    gridImporting
                      ? gridImportDisplayUnit
                      : gridExportDisplayUnit,
                    valueDec
                  )}</span
                >
              </div>
            `
          : nothing}

        <!-- Low-carbon chip (top of LEFT column): non-fossil share of the grid
             import; leader runs straight down into the grid chip below. -->
        ${showLowCarbon
          ? html`
              <svg class="low-carbon-leader-svg">
                <path
                  class="low-carbon-leader-line"
                  style="stroke:${lowCarbonColor}"
                  d=${lowCarbonLeaderPath}
                />
                ${lowCarbonBeadDur !== null
                  ? svg`
                            <circle class="low-carbon-leader-bead" r="3" style="fill:${lowCarbonColor}">
                                <animateMotion dur="${lowCarbonBeadDur.toFixed(2)}s" repeatCount="indefinite"
                                               path="${lowCarbonLeaderPath}" />
                            </circle>
                        `
                  : nothing}
              </svg>
              <div
                class="low-carbon-label"
                style="left:${layout!.lowCarbonLabel.x}px; top:${layout!
                  .lowCarbonLabel.y}px; --low-carbon-color:${lowCarbonColor}"
              >
                <ha-icon icon="mdi:leaf"></ha-icon>
                <span
                  >${formatGridValue(
                    this.hass,
                    lowCarbonWatts!,
                    "W",
                    valueDec
                  )}</span
                >
              </div>
            `
          : nothing}

        <!-- Solar arc, FAR-FRONT pass: above-horizon, nearness < 0.5; renders
             behind the chips (the arc's far half). -->
        ${showSun && arcSegmentsFrontFar.length > 0
          ? html`
              <svg
                class="solar-svg solar-svg-front-far"
                style="--solar-daylight:${sunScene!.daylight}"
              >
                ${arcSegmentsFrontFar.map(
                  (s) => svg`
                            <line
                                class="solar-arc-outline"
                                x1="${s.x1}" y1="${s.y1}"
                                x2="${s.x2}" y2="${s.y2}"
                                stroke-width="${
                                  OUTLINE_FAR +
                                  (OUTLINE_NEAR - OUTLINE_FAR) * s.nearness
                                }"
                            ></line>
                        `
                )}
                ${arcSegmentsFrontFar.map(
                  (s) => svg`
                            <line
                                class="solar-arc-segment"
                                x1="${s.x1}" y1="${s.y1}"
                                x2="${s.x2}" y2="${s.y2}"
                                stroke="${s.color}"
                                stroke-width="${
                                  SEGMENT_FAR +
                                  (SEGMENT_NEAR - SEGMENT_FAR) * s.nearness
                                }"
                            ></line>
                        `
                )}
              </svg>
            `
          : nothing}

        <!-- Solar arc, NEAR-FRONT pass: above-horizon, nearness >= 0.5; renders
             in front of the chips so the live arc reads on top on its near side. -->
        ${showSun && arcSegmentsFrontNear.length > 0
          ? html`
              <svg
                class="solar-svg solar-svg-front-near"
                style="--solar-daylight:${sunScene!.daylight}"
              >
                ${arcSegmentsFrontNear.map(
                  (s) => svg`
                            <line
                                class="solar-arc-outline"
                                x1="${s.x1}" y1="${s.y1}"
                                x2="${s.x2}" y2="${s.y2}"
                                stroke-width="${
                                  OUTLINE_FAR +
                                  (OUTLINE_NEAR - OUTLINE_FAR) * s.nearness
                                }"
                            ></line>
                        `
                )}
                ${arcSegmentsFrontNear.map(
                  (s) => svg`
                            <line
                                class="solar-arc-segment"
                                x1="${s.x1}" y1="${s.y1}"
                                x2="${s.x2}" y2="${s.y2}"
                                stroke="${s.color}"
                                stroke-width="${
                                  SEGMENT_FAR +
                                  (SEGMENT_NEAR - SEGMENT_FAR) * s.nearness
                                }"
                            ></line>
                        `
                )}
              </svg>
            `
          : nothing}

        <!-- Ray + bead in their own SVG below the chip family (z 7 < pv-pct-label
             z 8) so the PV chip occludes the ray endpoint at its border. -->
        ${showSun && showRay
          ? html`
              <svg
                class="solar-svg solar-ray-svg"
                style="--solar-daylight:${sunScene!.daylight}"
              >
                <line
                  class="solar-ray"
                  style="--sun-flow-duration:${sunFlowDuration}s"
                  x1=${sunScene!.sun.x}
                  y1=${sunScene!.sun.y}
                  x2=${sunRayTargetX}
                  y2=${sunRayTargetY}
                  stroke=${sunColor}
                ></line>
                <!-- Absolute-coordinate path (cx/cy at 0) keeps the SMIL animation
                     continuous during camera rotation. -->
                <circle class="solar-ray-bead" r="3" fill=${sunColor}>
                  <animateMotion
                    dur="${sunFlowDuration}s"
                    repeatCount="indefinite"
                    path="M ${sunScene!.sun.x},${sunScene!.sun
                      .y} L ${sunRayTargetX},${sunRayTargetY}"
                  ></animateMotion>
                </circle>
              </svg>
            `
          : nothing}
        ${showSun
          ? html`
              <svg
                class="solar-svg solar-svg-sun ${sunScene!.sun.nearness >= 0.5
                  ? "solar-svg-sun-near"
                  : "solar-svg-sun-far"}"
                style="--solar-daylight:${sunScene!.daylight}"
              >
                ${(() => {
                  // Sun disc, four concentric layers back-to-front: halo (glow
                  // scaling with irradiance), background fill (faint tint), inner
                  // fill (radius = sunFillRatio × r, conveys irradiance), outer rim.
                  // Scale disc + halo by the engine's sun-arc ramp so the disc-to-arc
                  // ratio stays constant across canvas sizes (1.0 at grid sizes).
                  const sunArcScale = this._engine?.getSunArcScale() ?? 1;
                  const r =
                    (SUN_R_FAR +
                      (SUN_R_NEAR - SUN_R_FAR) * sunScene!.sun.nearness) *
                    sunArcScale;
                  const rInner = r * sunFillRatio;
                  const haloR = r * 3;
                  const haloAlphaMax = sunFillRatio * 0.55;
                  return svg`
                                <defs>
                                    <radialGradient id="solar-halo-grad">
                                        <stop offset="0%"   stop-color="${sunColor}" stop-opacity="${haloAlphaMax}"></stop>
                                        <stop offset="100%" stop-color="${sunColor}" stop-opacity="0"></stop>
                                    </radialGradient>
                                </defs>
                                <circle
                                    class="solar-sun-halo"
                                    cx="${sunScene!.sun.x}" cy="${sunScene!.sun.y}"
                                    r="${haloR}"
                                    fill="url(#solar-halo-grad)"
                                ></circle>
                                <circle
                                    class="solar-sun-bg"
                                    cx="${sunScene!.sun.x}" cy="${sunScene!.sun.y}"
                                    r="${r}"
                                    fill="${sunColor}"
                                    fill-opacity="${SUN_FILL_OPACITY_BG}"
                                ></circle>
                                <circle
                                    class="solar-sun-fill"
                                    cx="${sunScene!.sun.x}" cy="${sunScene!.sun.y}"
                                    r="${rInner}"
                                    fill="${sunColor}"
                                    stroke="${sunRimColor}"
                                    stroke-width="0.5"
                                ></circle>
                                <circle
                                    class="solar-sun-rim"
                                    cx="${sunScene!.sun.x}" cy="${sunScene!.sun.y}"
                                    r="${r}"
                                    fill="none"
                                    stroke="${sunColor}"
                                    stroke-width="${SUN_RIM_WIDTH}"
                                ></circle>
                            `;
                })()}
              </svg>
            `
          : nothing}

        <!-- W/m² label, pinned above the sun disc. -->
        ${showSunLabel
          ? html`
              <div
                class="solar-pct-label"
                style="left:${sunScene!.sun.x}px; top:${sunScene!.sun.y - 22}px"
              >
                <ha-icon icon="mdi:white-balance-sunny"></ha-icon>
                <span>${sunWm2Round} W/m²</span>
              </div>
            `
          : nothing}

        <!-- Home hover glow: sun-coloured halo around the home silhouette, reusing
             the cloud-disc mask rings so it tracks rotation. Opacity toggled via
             a class for a pure-CSS fade. -->
        ${hasHomeCoords && this._homeSilhouettes.length > 0
          ? (() => {
              const glowSunColor = DEFAULT_SUN_COLOR_HEX;
              const silhouettePts = this._getSilhouettePoints();
              const glowClasses = [
                "home-glow-svg",
                this._homeHover ? "is-hovered" : "",
              ]
                .filter(Boolean)
                .join(" ");
              return html`
                <svg
                  class=${glowClasses}
                  style="--sun-color:${glowSunColor};--pv-leader-color:${pvColor};--pv-flow-duration:${pvFlowDuration}s"
                  @mouseenter=${this._onHomeEnter}
                  @mouseleave=${this._onHomeLeave}
                >
                  ${silhouettePts.map((sil) =>
                    sil === null
                      ? nothing
                      : svg`
                                <polygon class="home-glow-shape" points="${sil.base}" />
                                <polygon class="home-glow-shape" points="${sil.top}" />
                                ${sil.walls.map(
                                  (w) => svg`
                                    <polygon class="home-glow-shape" points="${w}" />
                                `
                                )}
                            `
                  )}
                </svg>
              `;
            })()
          : nothing}

        <!-- Home pill: the central energy hub every chip leader docks against. -->
        ${hasHomeCoords && layout !== null
          ? html`
              <!-- Drop leader tethering the floating pill down to the building. -->
              ${(() => {
                const end = this._nudgeToHomeCircle(
                  layout!.homeBase.x,
                  layout!.homeBase.y,
                  layout!.home.x,
                  layout!.home.y
                );
                return html`
                  <svg class="pv-home-leader-svg">
                    <line
                      x1=${layout!.homeBase.x}
                      y1=${layout!.homeBase.y}
                      x2=${end.x}
                      y2=${end.y}
                      style="stroke: var(--primary-color, #03a9f4); stroke-width: 2; stroke-linecap: round; opacity: 0.85;"
                    ></line>
                  </svg>
                `;
              })()}
              <!-- Invisible hitbox over the home node: hover lights the glow,
                   click enters weather mode (the pill is pointer-events:none). -->
              <div
                class="home-hitbox"
                style="left:${layout!.home.x}px; top:${layout!.home.y}px"
                role="button"
                tabindex="0"
                aria-label="Weather mode"
                @click=${this._onHomeClick}
                @mouseenter=${this._onHomeEnter}
                @mouseleave=${this._onHomeLeave}
              ></div>
              <div
                class="home-pill ${showHomeUsageChip ? "has-usage" : ""} ${this
                  ._homeHover
                  ? "is-hovered"
                  : ""}"
                style="left:${layout!.home.x}px; top:${layout!.home.y}px"
              >
                <ha-icon icon="mdi:home"></ha-icon>
                ${showHomeUsageChip
                  ? html`<span class="home-pill-usage">${homeUsageText}</span>`
                  : nothing}
              </div>
            `
          : nothing}

        <div class="bottom">
          <div class="timelines">${this._renderTimeline()}</div>
          ${this._renderTimelineFooter()}
        </div>
      </ha-card>
    `;
  }

  // Top-left card title, from the (localized) config `title`.
  private _renderTitle(): TemplateResult | typeof nothing {
    const title = this.config?.["title"];
    if (typeof title !== "string" || title === "") {
      return nothing;
    }
    return html`<div class="title">${title}</div>`;
  }

  // Top-right value chip showing the represented instant (scrub or live).
  private _renderTimeChip(): TemplateResult | typeof nothing {
    const model = this._timelineModel();
    if (!model) {
      return nothing;
    }
    const t = this._selectedTime ?? new Date();
    // Only offer "back to live" when the window contains the present.
    const showLive = this._selectedTime !== null && this._windowContainsNow();
    return html`
      <div class="chip-row">
        ${showLive
          ? html`<button
              class="live-chip"
              aria-label="Live"
              @click=${this._backToLive}
            >
              <hui-energy-graph-chip>
                <ha-icon icon="mdi:restore"></ha-icon>
              </hui-energy-graph-chip>
            </button>`
          : nothing}
        <hui-energy-graph-chip>
          ${this._formatRepresentedTime(model.kind, t)}
        </hui-energy-graph-chip>
      </div>
    `;
  }

  // Return to live: drop the scrub instant so map + chips track the present.
  private _backToLive = (): void => {
    this._selectedTime = null;
    this._isLiveMode = true;
    this._engine?.setSelectedTime(null);
  };

  private _formatRepresentedTime(_kind: TimelineKind, d: Date): string {
    if (!this.hass) {
      return "";
    }
    return formatShortDateTime(d, this.hass.locale, this.hass.config);
  }

  // Scrubbable timeline bound to the Energy date pick: production curve (+ dashed
  // forecast) backdrop, adaptive gridlines, live + scrub cursors. Dragging scrubs
  // the engine instant so the map reflects the selected moment.
  private _renderTimeline(): TemplateResult | typeof nothing {
    const model = this._timelineModel();
    if (!model) {
      return nothing;
    }
    const t0 = model.start.getTime();
    const t1 = model.end.getTime();
    const span = t1 - t0 || 1;

    // Production curve + dashed forecast as the bar backdrop. SVG viewBox stretched
    // to the bar (preserveAspectRatio:none) with a non-scaling stroke.
    const W = 1000;
    const H = 100;
    // Top padding so the curve peak never touches the top edge.
    const TOP_PAD = 14;
    const pts = this._productionSeries.filter((p) => p.t >= t0 && p.t <= t1);
    // Forecast curve across the whole window, independent of production, so the
    // future forecast shows where no production exists yet. Wh/hour read as avg watts.
    const fpts = this._haSolarForecast
      .filter((p) => p.tMs >= t0 && p.tMs <= t1)
      .map((p) => ({ t: p.tMs, v: p.wh / 1000 }));
    let area = "";
    let line = "";
    let fline = "";
    if (pts.length > 0 || fpts.length > 0) {
      // Shared vertical scale so production and forecast read against each other.
      const maxV = Math.max(
        ...pts.map((p) => p.v),
        ...fpts.map((p) => p.v),
        1e-6
      );
      const toXY = (p: { t: number; v: number }) => ({
        x: ((p.t - t0) / span) * W,
        y: H - (p.v / maxV) * (H - TOP_PAD),
      });
      if (pts.length > 0) {
        const xy = pts.map(toXY);
        line = xy
          .map(
            (p, i) =>
              `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)},${p.y.toFixed(2)}`
          )
          .join(" ");
        area = `M ${xy[0].x.toFixed(2)},${H} ${xy
          .map((p) => `L ${p.x.toFixed(2)},${p.y.toFixed(2)}`)
          .join(" ")} L ${xy[xy.length - 1].x.toFixed(2)},${H} Z`;
      }
      if (fpts.length > 1) {
        const fxy = fpts.map(toXY);
        fline = fxy
          .map(
            (p, i) =>
              `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)},${p.y.toFixed(2)}`
          )
          .join(" ");
      }
    }

    const now = Date.now();
    const liveFrac = now >= t0 && now <= t1 ? (now - t0) / span : null;
    const sel = this._selectedTime?.getTime();
    const selFrac =
      sel !== undefined && sel >= t0 && sel <= t1 ? (sel - t0) / span : null;
    // Cursor at the scrubbed instant, else live; the fill grows up to it.
    const cursorFrac = selFrac ?? liveFrac;
    // Gridlines at the EXACT footer-label positions so each legend value sits
    // centred on its own separator.
    const seps = model.labels.filter((s) => s.frac > 0.02 && s.frac < 0.98);

    return html`
      <div
        class="timeline"
        @pointerdown=${this._onTimelinePointerDown}
        @pointermove=${this._onTimelinePointerMove}
        @pointerup=${this._onTimelinePointerUp}
        @pointercancel=${this._onTimelinePointerUp}
      >
        <div class="timeline-track">
          <div class="timeline-bar">
            ${cursorFrac !== null
              ? html`<div
                  class="timeline-fill"
                  style="width:${(cursorFrac * 100).toFixed(3)}%"
                ></div>`
              : nothing}
            ${area || fline
              ? html`<svg
                  class="chart-svg"
                  viewBox="0 0 ${W} ${H}"
                  preserveAspectRatio="none"
                >
                  ${area
                    ? svg`<path class="chart-prod-area" d="${area}"></path>
                        <path class="chart-prod-line" d="${line}"></path>`
                    : nothing}
                  ${fline
                    ? svg`<path
                        class="chart-forecast-line"
                        d="${fline}"
                      ></path>`
                    : nothing}
                </svg>`
              : nothing}
            ${seps.map(
              (s) =>
                html`<div
                  class="timeline-sep"
                  style="left:${(s.frac * 100).toFixed(3)}%"
                ></div>`
            )}
          </div>
          ${liveFrac !== null && selFrac !== null
            ? html`<div
                class="timeline-now"
                style="left:${(liveFrac * 100).toFixed(3)}%"
              ></div>`
            : nothing}
          ${cursorFrac !== null
            ? html`<div
                class="timeline-cursor"
                style="left:${(cursorFrac * 100).toFixed(3)}%"
              ></div>`
            : nothing}
        </div>
      </div>
    `;
  }

  // Footer holding the time labels on a solid theme surface.
  private _renderTimelineFooter(): TemplateResult | typeof nothing {
    const model = this._timelineModel();
    if (!model) {
      return nothing;
    }
    const labels = model.labels.filter((s) => s.frac > 0.02 && s.frac < 0.98);
    return html`
      <div class="timeline-footer">
        ${labels.map(
          (s) =>
            html`<span
              class="timeline-label"
              style="left:${(s.frac * 100).toFixed(3)}%"
              >${this._timelineSepLabel(model.kind, s.date)}</span
            >`
        )}
      </div>
    `;
  }

  private _timelineSepLabel(kind: TimelineKind, d: Date): string {
    if (!this.hass) {
      return "";
    }
    const { locale, config } = this.hass;
    if (kind === "intraday") {
      return formatTime(d, locale, config);
    }
    if (kind === "days") {
      return formatDateWeekdayShort(d, locale, config);
    }
    if (kind === "weeks") {
      // Day + short month, so weekly ticks read as distinct dates.
      return formatDateVeryShort(d, locale, config);
    }
    return formatDateMonthShort(d, locale, config);
  }

  private _timelineModel(): TimelineModel | null {
    if (!this._energyStart || !this._energyEnd) {
      return null;
    }
    // ~one label per 95px of card width (falls back to the default before the
    // first width observation lands).
    const w = this._timelineWidth || this.clientWidth || 0;
    const maxTicks =
      w > 0
        ? Math.max(4, Math.min(24, Math.floor((w - 32) / 95)))
        : TIMELINE_MAX_TICKS;
    return buildTimelineModel(this._energyStart, this._energyEnd, maxTicks);
  }

  // Whether the selected window straddles the present moment.
  private _windowContainsNow(): boolean {
    if (!this._energyStart || !this._energyEnd) {
      return false;
    }
    const now = Date.now();
    return (
      now >= this._energyStart.getTime() && now <= this._energyEnd.getTime()
    );
  }

  // Default instant for a freshly picked window: live (null) when it contains the
  // present, else solar noon of the last day.
  private _defaultInstantForWindow(start: Date, end: Date): Date | null {
    const now = Date.now();
    if (now >= start.getTime() && now <= end.getTime()) {
      return null;
    }
    const noon = startOfDay(end);
    noon.setHours(12, 0, 0, 0);
    return noon;
  }

  private _subscribeEnergyCollection(): void {
    if (!this.hass || this._energyCollectionUnsub) {
      return;
    }
    const rawKey = this.config?.["collection_key"];
    const key =
      typeof rawKey === "string" ? rawKey : DEFAULT_ENERGY_COLLECTION_KEY;
    this._energyCollectionUnsub = getEnergyDataCollection(this.hass, {
      key,
    }).subscribe((data) => {
      const newStart = data.start;
      const newEnd = data.end ?? endOfDay(data.start);
      const changed =
        !this._energyStart ||
        !this._energyEnd ||
        this._energyStart.getTime() !== newStart.getTime() ||
        this._energyEnd.getTime() !== newEnd.getTime();
      this._energyStart = newStart;
      this._energyEnd = newEnd;
      // On a date-pick change, reset the instant (live for a present window,
      // solar noon of the last day otherwise).
      if (changed) {
        const instant = this._defaultInstantForWindow(newStart, newEnd);
        this._selectedTime = instant;
        this._isLiveMode = instant === null;
        this._engine?.setSelectedTime(instant);
      }
      // Reparse prefs only when the reference changed (the collection swaps it
      // only on a dashboard edit).
      if (data.prefs !== this._lastParsedPrefs) {
        this._lastParsedPrefs = data.prefs;
        // parseEnergyPrefs reads the raw JSON defensively (optional slots), so it
        // takes a loose record shape rather than the strict EnergyPreferences union.
        this._energyDefaults = parseEnergyPrefs(
          data.prefs as unknown as {
            energy_sources?: Record<string, unknown>[];
          }
        );
        this._energyDefaultsLoaded = true;
      }
      const solarIds: string[] = [];
      for (const src of data.prefs.energy_sources) {
        if (src.type === "solar" && src.stat_energy_from) {
          solarIds.push(src.stat_energy_from);
        }
      }
      this._solarStatIds = solarIds;
      this._refreshProductionChart();
      this.requestUpdate();
    });
  }

  // Fetch the solar production curve over the selected window at an adaptive
  // resolution (hourly up to ~2 weeks, daily beyond).
  private async _refreshProductionChart(): Promise<void> {
    if (
      !this.hass ||
      !this._energyStart ||
      !this._energyEnd ||
      this._solarStatIds.length === 0
    ) {
      this._productionSeries = [];
      return;
    }
    const startMs = this._energyStart.getTime();
    const endMs = this._energyEnd.getTime();
    const period = adaptivePeriodFor(endMs - startMs);
    const buckets = await fetchChangeSeries(
      this.hass,
      this._solarStatIds,
      startMs,
      endMs,
      period
    );
    // Drop a stale result if the window moved while the fetch was in flight.
    if (
      this._energyStart?.getTime() !== startMs ||
      this._energyEnd?.getTime() !== endMs
    ) {
      return;
    }
    // Store average POWER (kW) per bucket so magnitude is independent of bucket
    // size and reads on the same scale as the forecast power curve.
    this._productionSeries = (buckets ?? []).map((b) => {
      const hours = (b.endMs - b.startMs) / 3_600_000 || 1;
      return { t: b.startMs, v: b.kwh / hours };
    });
    this.requestUpdate();
  }

  private _onTimelinePointerDown = (e: PointerEvent): void => {
    if (!this._timelineModel()) {
      return;
    }
    this._timelineScrubbing = true;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    this._applyTimelineScrub(e);
  };
  private _onTimelinePointerMove = (e: PointerEvent): void => {
    if (this._timelineScrubbing) {
      this._applyTimelineScrub(e);
    }
  };
  private _onTimelinePointerUp = (e: PointerEvent): void => {
    if (!this._timelineScrubbing) {
      return;
    }
    this._timelineScrubbing = false;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
  };
  private _applyTimelineScrub(e: PointerEvent): void {
    const model = this._timelineModel();
    const track = e.currentTarget as HTMLElement | null;
    if (!model || !track) {
      return;
    }
    const rect = track.getBoundingClientRect();
    const frac = Math.min(
      1,
      Math.max(0, (e.clientX - rect.left) / (rect.width || 1))
    );
    const t = new Date(
      model.start.getTime() +
        frac * (model.end.getTime() - model.start.getTime())
    );
    this._selectedTime = t;
    this._isLiveMode = false;
    this._engine?.setSelectedTime(t);
  }

  // Per-card unique id namespacing SVG <defs> ids so multiple cards don't clash.
  _instanceId = `h${Math.floor(Math.random() * 1e9).toString(36)}`;

  // Hover handlers on the home hitbox toggling the glow halo.
  private _onHomeEnter = (): void => {
    this._homeHover = true;
  };
  private _onHomeLeave = (): void => {
    this._homeHover = false;
  };

  // Click the home node to enter the weather overlay.
  private _onHomeClick = (): void => {
    if (this._cardMode !== "weather") {
      this._cardMode = "weather";
      this._homeHover = false;
    }
  };
  private _onWeatherHomeReturn = (): void => {
    if (this._cardMode === "weather") {
      this._cardMode = "base";
    }
  };

  // Toggle one of the three weather cloud layers (shader bands sync in updated()).
  private _onCloudBandClick(ev: Event): void {
    const band = (ev.currentTarget as HTMLElement | null)?.dataset.band as
      | "low"
      | "mid"
      | "high"
      | undefined;
    if (band) {
      this._toggleCloudBand(band);
    }
  }

  private _toggleCloudBand(band: "low" | "mid" | "high"): void {
    if (band === "low") {
      this._weatherShowLow = !this._weatherShowLow;
    } else if (band === "mid") {
      this._weatherShowMid = !this._weatherShowMid;
    } else {
      this._weatherShowHigh = !this._weatherShowHigh;
    }
  }

  private _cloudBandLabel(band: "low" | "mid" | "high"): string {
    const l = this.hass?.localize;
    if (band === "low") {
      return (
        l?.("ui.panel.energy.cards.energy_solar_overview.cloud_band_low") ??
        "Low"
      );
    }
    if (band === "mid") {
      return (
        l?.("ui.panel.energy.cards.energy_solar_overview.cloud_band_mid") ??
        "Mid"
      );
    }
    return (
      l?.("ui.panel.energy.cards.energy_solar_overview.cloud_band_high") ??
      "High"
    );
  }

  // Mode-transition state machine called from updated(): drives _overlayMaskActive
  // (on when leaving base, off immediately on weather -> base since the dome is
  // faint) and the weather enter / exit kicks. CSS transitions handle the rest.
  private _handleCardModeChange(prev: CardMode, next: CardMode): void {
    if (next !== "base") {
      this._overlayMaskActive = true;
    }

    if (prev === "weather" && next !== "weather") {
      if (this._weatherOverlayVisible) {
        exitWeatherMode(this);
      }
      if (next === "base") {
        // Faint overlay, so lift the mask immediately while it fades out.
        this._overlayMaskActive = false;
      }
    } else if (prev !== "weather" && next === "weather") {
      enterWeatherMode(this);
    }
  }
  // Camera lock state for the top-left lock button, delegated to the engine.
  private _isCameraLocked(): boolean {
    if (this._engine) {
      return this._engine.isCameraLocked();
    }
    return false;
  }

  static styles = [
    solarOverviewCardStyles,
    css`
      /* Header row: title + time chip, padded like a standard energy card-header. */
      .header {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        z-index: 21;
        display: flex;
        align-items: center;
        gap: var(--ha-space-2, 8px);
        padding: var(--ha-space-3, 12px) var(--ha-space-4, 16px);
        box-sizing: border-box;
        /* Title is click-through to the map; the chip row re-enables events. */
        pointer-events: none;
      }
      .title {
        flex: 1;
        min-width: 0;
        margin: 0;
        font-family: var(--ha-card-header-font-family, inherit);
        font-size: var(--ha-card-header-font-size, var(--ha-font-size-2xl));
        font-weight: var(--ha-font-weight-normal);
        letter-spacing: -0.012em;
        line-height: var(--ha-line-height-expanded);
        color: var(--ha-card-header-color, var(--primary-text-color));
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      /* Top-right chip row: optional Live button + the represented-time chip,
         both styled like the energy graph value badges. */
      .chip-row {
        /* margin-left:auto keeps it right-aligned even with no title; re-enables events. */
        margin-left: auto;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        gap: var(--ha-space-2, 8px);
        pointer-events: auto;
      }
      /* Weather mode return button: a glowing disc + home glyph, centred over the
         top-down map. The only chrome in weather mode; click returns to base. */
      .weather-home {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        z-index: 25;
        width: 52px;
        height: 52px;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--primary-text-color);
        background: var(--card-background-color, #1c1c1c);
        --home-glow: color-mix(
          in srgb,
          var(--sun-color, var(--amber-color, #f59e0b)) 55%,
          transparent
        );
        box-shadow:
          0 0 0 2px var(--home-glow),
          0 0 22px 4px var(--home-glow);
        animation: weather-home-pulse 2.6s ease-in-out infinite;
      }
      .weather-home ha-icon {
        --mdc-icon-size: 26px;
      }
      @keyframes weather-home-pulse {
        0%,
        100% {
          box-shadow:
            0 0 0 2px var(--home-glow),
            0 0 16px 2px var(--home-glow);
        }
        50% {
          box-shadow:
            0 0 0 2px var(--home-glow),
            0 0 32px 7px var(--home-glow);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .weather-home {
          animation: none;
        }
      }
      /* Cloud-layer segmented control: one rounded container, three toggle
         segments in the HA segmented-control vocabulary, active segment filled
         with the primary colour. Centred at the top of the card. */
      .cloud-bands {
        position: absolute;
        top: var(--ha-space-3, 12px);
        left: 50%;
        transform: translateX(-50%);
        z-index: 22;
        display: inline-flex;
        gap: 2px;
        padding: 3px;
        border-radius: 999px;
        background: var(--card-background-color, #1c1c1c);
        border: 1px solid var(--divider-color);
        box-shadow: var(--ha-card-box-shadow, 0 2px 6px rgba(0, 0, 0, 0.2));
      }
      .cloud-band {
        appearance: none;
        -webkit-appearance: none;
        border: none;
        background: transparent;
        color: var(--secondary-text-color);
        font-family: inherit;
        font-size: var(--ha-font-size-s, 12px);
        font-weight: var(--ha-font-weight-medium, 500);
        line-height: 1;
        padding: var(--ha-space-1, 4px) var(--ha-space-3, 12px);
        border-radius: 999px;
        cursor: pointer;
        transition:
          background 0.15s ease,
          color 0.15s ease;
      }
      .cloud-band.is-on {
        background: var(--primary-color, #03a9f4);
        color: var(--text-primary-color, #fff);
      }
      .live-chip {
        appearance: none;
        -webkit-appearance: none;
        border: none;
        background: none;
        padding: 0;
        margin: 0;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        font: inherit;
        color: inherit;
      }
      .live-chip ha-icon {
        --mdc-icon-size: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      /* Timeline area pinned to the bottom: production chart over the scrub bar. */
      .bottom {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 20;
      }
      .timelines {
        padding: var(--ha-space-3, 12px) var(--ha-space-4, 16px)
          var(--ha-space-3, 12px);
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        gap: var(--ha-space-3, 12px);
      }
      /* Footer: time labels on a solid theme surface so they stay readable over
         any basemap, with a hairline separating them from the timelines. */
      .timeline-footer {
        position: relative;
        height: 34px;
        padding: 0 var(--ha-space-4, 16px);
        box-sizing: border-box;
        background: var(--card-background-color, #fff);
        border-top: 1px solid var(--divider-color);
      }
      .timeline {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: var(--ha-space-1, 4px);
        touch-action: none;
        cursor: ew-resize;
      }
      /* Production curve: SVG stretched to the bar, solar-coloured area
         + line. preserveAspectRatio:none stretches the viewBox, so the line uses
         a non-scaling stroke to stay crisp. */
      .chart-svg {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        display: block;
      }
      .chart-prod-area {
        fill: color-mix(
          in srgb,
          var(--energy-solar-color, #ff9800) 28%,
          transparent
        );
        stroke: none;
      }
      .chart-prod-line {
        fill: none;
        stroke: var(--energy-solar-color, #ff9800);
        stroke-width: 1.5px;
        vector-effect: non-scaling-stroke;
      }
      /* Forecast: a dashed line in the solar colour, same vocabulary as HA's
         solar forecast on the energy graphs. */
      .chart-forecast-line {
        fill: none;
        stroke: var(--energy-solar-color, #ff9800);
        stroke-width: 1.5px;
        stroke-dasharray: 4 3;
        opacity: 0.85;
        vector-effect: non-scaling-stroke;
      }
      .timeline-track {
        position: relative;
        width: 100%;
        /* Single unified bar carrying the production curve + scrub. */
        height: 67px;
      }
      .timeline-bar {
        position: absolute;
        inset: 0;
        border-radius: var(--ha-border-radius-lg, 8px);
        background: color-mix(
          in srgb,
          var(--card-background-color, #fff) 70%,
          transparent
        );
        border: var(--ha-border-width-sm, 1px) solid
          color-mix(
            in srgb,
            var(--sun-color, var(--amber-color, #f59e0b)) 60%,
            transparent
          );
        overflow: hidden;
        -webkit-backdrop-filter: blur(2px);
        backdrop-filter: blur(2px);
      }
      .timeline-fill {
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        background: color-mix(
          in srgb,
          var(--sun-color, var(--amber-color, #f59e0b)) 12%,
          transparent
        );
        pointer-events: none;
      }
      .timeline-sep {
        position: absolute;
        top: 0;
        height: 100%;
        width: 1px;
        transform: translateX(-50%);
        background: color-mix(
          in srgb,
          var(--primary-text-color, #fff) 22%,
          transparent
        );
        pointer-events: none;
      }
      .timeline-now {
        position: absolute;
        top: 0;
        height: 100%;
        width: 2px;
        transform: translateX(-50%);
        background: color-mix(
          in srgb,
          var(--primary-color, #03a9f4) 70%,
          transparent
        );
        pointer-events: none;
      }
      .timeline-cursor {
        position: absolute;
        top: -6px;
        height: calc(100% + 12px);
        width: 2px;
        transform: translateX(-50%);
        background: var(--primary-text-color);
        z-index: 1;
        pointer-events: none;
      }
      .timeline-label {
        position: absolute;
        /* Vertically centred in the footer band, horizontally centred on the
           period the label names. */
        top: 50%;
        transform: translate(-50%, -50%);
        font-family: var(--ha-font-family-body, "Roboto", "Noto", sans-serif);
        font-size: var(--ha-font-size-s, 12px);
        color: var(--primary-text-color);
        white-space: nowrap;
        pointer-events: none;
      }
    `,
  ];
}
