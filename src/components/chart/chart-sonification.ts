import type { HassConfig } from "home-assistant-js-websocket";
import type { EChartsType } from "echarts/core";
import type { XAXisOption, YAXisOption } from "echarts/types/dist/shared";
import { ensureArray } from "../../common/array/ensure-array";
import { formatDateTime } from "../../common/datetime/format_date_time";
import type { LocalizeFunc } from "../../common/translations/localize";
import type { FrontendLocaleData } from "../../data/translation";
import type {
  HaECSeries,
  HaECSeriesItem,
} from "../../resources/echarts/echarts";

export interface ChartSonification {
  update: () => void;
  dispose: () => void;
}

// Series types the Chart2Music ECharts extension can turn into data points. Our
// other series (custom timelines, sankey, network graphs) have no equivalent, and
// the extension refuses the whole chart if a single series is unsupported.
const SONIFIABLE_SERIES_TYPES = new Set(["bar", "line", "pie", "scatter"]);

// Languages shipped by chart2music. Anything else falls back to its English.
const SONIFICATION_LANGUAGES = new Set(["de", "en", "es", "fr", "hmn", "it"]);

// Fewer than this and there is nothing to walk between, so a focus stop would
// lead nowhere.
const MIN_NAVIGABLE_POINTS = 2;

// Mirrors the extension's own reading of a point: it takes `value` as [x, y] and
// drops anything whose y is not a real number. That rejects gap-only series, and
// also value-first pairs like the energy device charts' [amount, "sensor.foo"].
// Counts no further than `limit` so this stays cheap on charts with many points.
const countNumericPoints = (data: unknown, limit: number): number => {
  if (!Array.isArray(data)) {
    return 0;
  }
  let found = 0;
  for (const raw of data) {
    let y: unknown = raw;
    if (Array.isArray(raw)) {
      y = raw.length > 1 ? raw[1] : raw[0];
    } else if (raw && typeof raw === "object") {
      const { value } = raw as { value?: unknown };
      y = Array.isArray(value)
        ? value.length > 1
          ? value[1]
          : value[0]
        : value;
    }
    if (typeof y === "number" && !Number.isNaN(y)) {
      found += 1;
      if (found >= limit) {
        break;
      }
    }
  }
  return found;
};

const countNavigablePoints = (
  series: readonly ({ data?: unknown } | undefined)[]
): number => {
  let total = 0;
  for (const s of series) {
    total += countNumericPoints(s?.data, MIN_NAVIGABLE_POINTS - total);
    if (total >= MIN_NAVIGABLE_POINTS) {
      break;
    }
  }
  return total;
};

export const canSonifyChart = (
  data: HaECSeries,
  // Legend-hidden series reach ECharts with their data stripped, so they cannot
  // be sonified either.
  hiddenDatasets?: ReadonlySet<string>
): boolean => {
  const series = ensureArray(data);
  const visible = hiddenDatasets?.size
    ? series.filter((s) => !hiddenDatasets.has(String(s.id ?? s.name)))
    : series;
  return (
    // Cards commonly push empty placeholder series, so judge the chart by the
    // points the extension can actually read — but every type has to be
    // convertible too.
    countNavigablePoints(visible) >= MIN_NAVIGABLE_POINTS &&
    series.every((s) => SONIFIABLE_SERIES_TYPES.has(s.type as string))
  );
};

interface SonifyChartOptions {
  cc: HTMLElement;
  localize: LocalizeFunc;
  locale: FrontendLocaleData;
  config: HassConfig;
  onError: (error: string) => void;
}

// Chart2Music appends its help and options dialogs straight to document.body, so
// they can only be themed from a document-level stylesheet.
let stylesAppended = false;
const appendSonificationStyles = () => {
  if (stylesAppended) {
    return;
  }
  stylesAppended = true;
  const style = document.createElement("style");
  style.textContent = `
    dialog.chart2music-dialog {
      box-sizing: border-box;
      max-width: min(600px, calc(100vw - 32px));
      max-height: calc(100vh - 32px);
      overflow: auto;
      padding: var(--ha-space-6);
      border: none;
      border-radius: var(--ha-border-radius-lg);
      background-color: var(--card-background-color);
      color: var(--primary-text-color);
      font-family: var(--ha-font-family-body);
      font-size: var(--ha-font-size-m);
      box-shadow: var(--ha-box-shadow-l);
    }
    dialog.chart2music-dialog::backdrop {
      background-color: rgba(0, 0, 0, 0.5);
    }
    dialog.chart2music-dialog h1 {
      font-size: var(--ha-font-size-2xl);
      font-weight: var(--ha-font-weight-normal);
      margin-block: 0 var(--ha-space-4);
      padding-inline-end: var(--ha-space-8);
    }
    dialog.chart2music-dialog table {
      border-collapse: collapse;
      width: 100%;
    }
    dialog.chart2music-dialog th,
    dialog.chart2music-dialog td {
      text-align: start;
      padding: var(--ha-space-1) var(--ha-space-2);
      border-bottom: 1px solid var(--divider-color);
    }
    dialog.chart2music-dialog a {
      color: var(--primary-color);
    }
    dialog.chart2music-dialog > button {
      /* The extension inlines "right", which does not mirror in RTL, and inline
         styles can only be beaten with !important. */
      inset-inline-end: var(--ha-space-4) !important;
      inset-inline-start: auto !important;
      top: var(--ha-space-4);
      min-width: 32px;
      min-height: 32px;
      cursor: pointer;
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-border-radius-sm);
      background-color: transparent;
      color: var(--primary-text-color);
      font: inherit;
    }
  `;
  document.head.append(style);
};

export const sonifyChart = async (
  chart: EChartsType,
  options: SonifyChartOptions
): Promise<ChartSonification | null> => {
  const { connect } = await import("echarts-extension-chart2music");
  const { localize, locale, config } = options;
  appendSonificationStyles();

  // ECharts nulls its model on dispose, and the instance can be disposed while
  // the chunk is in flight.
  const chartOptions = chart.getOption() as ReturnType<
    EChartsType["getOption"]
  > | null;
  if (!chartOptions) {
    return null;
  }
  const xAxis = ensureArray(chartOptions.xAxis)[0] as XAXisOption | undefined;
  const yAxis = ensureArray(chartOptions.yAxis)[0] as YAXisOption | undefined;

  // Chart2Music throws while validating a group with no points, which is what
  // placeholder, legend-hidden and all-null series turn into, so only offer it
  // the series carrying points it can read.
  const allSeries = ensureArray(chartOptions.series) as (
    HaECSeriesItem | undefined
  )[];
  const readable = allSeries.filter((s) => countNumericPoints(s?.data, 1));
  // A single point is not navigable, so it does not earn a focus stop either.
  if (countNavigablePoints(readable) < MIN_NAVIGABLE_POINTS) {
    return null;
  }
  const seriesIndex = readable.map((s) => allSeries.indexOf(s));

  // Chart2Music always reads out an axis label, and the extension picks the wrong
  // axis to name when there is no category axis, so label both explicitly.
  const isTimeAxis = xAxis?.type === "time";
  const x = {
    label:
      xAxis?.name ||
      localize(
        isTimeAxis
          ? "ui.components.history_charts.time"
          : "ui.components.history_charts.category"
      ),
    // Time series carry raw timestamps, which would otherwise be announced as
    // epoch milliseconds.
    format: isTimeAxis
      ? (value: number) => formatDateTime(new Date(value), locale, config)
      : undefined,
  };
  const y = {
    label: yAxis?.name || localize("ui.components.history_charts.value"),
  };

  let connection: ReturnType<typeof connect>;
  try {
    connection = connect(chart, {
      cc: options.cc,
      seriesIndex,
      title: localize("ui.components.history_charts.chart"),
      lang: SONIFICATION_LANGUAGES.has(locale.language)
        ? locale.language
        : "en",
      errorCallback: options.onError,
      axes: { x, y },
    });
  } catch (err) {
    options.onError(err instanceof Error ? err.message : String(err));
    return null;
  }
  if (!connection) {
    return null;
  }
  // Chart2Music bails out silently on mobile user agents, returning an instance
  // that never wired anything up. Turning the caption container into a live
  // region is the last thing it does, so use that as the "really connected" test
  // rather than leaving a focus stop that does nothing.
  if (!options.cc.hasAttribute("aria-live")) {
    connection.dispose();
    return null;
  }
  const connected = connection;

  // The extension re-reads the chart from ECharts' own "finished" event. Run that
  // through a guard of our own so a conversion failure cannot escape into
  // ECharts' event dispatch and leave the chart half-rendered.
  const update = () => {
    try {
      connected.update();
    } catch (_err) {
      // Keep whatever Chart2Music last read successfully.
    }
  };
  chart.off("finished", connected.update);
  chart.on("finished", update);

  return {
    update,
    dispose: () => {
      chart.off("finished", update);
      connected.dispose();
    },
  };
};
