import { TZDate } from "@date-fns/tz";
import type {
  Connection,
  HassConfig,
  HassEntity,
  UnsubscribeFunc,
} from "home-assistant-js-websocket";
import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { computeCssColor } from "../../../common/color/compute-color";
import { resolveTimeZone } from "../../../common/datetime/resolve-time-zone";
import { useAmPm } from "../../../common/datetime/use_am_pm";
import { consume } from "../../../common/decorators/consume";
import { consumeEntityState } from "../../../common/decorators/consume-context-entry";
import { transform } from "../../../common/decorators/transform";
import { computeDomain } from "../../../common/entity/compute_domain";
import { stateColorCss } from "../../../common/entity/state_color";
import type { LocalizeFunc } from "../../../common/translations/localize";
import type { CalendarEventApiData } from "../../../data/calendar";
import { subscribeCalendarEvents } from "../../../data/calendar";
import {
  apiContext,
  configContext,
  connectionContext,
  internationalizationContext,
} from "../../../data/context";
import type { ScheduleDay } from "../../../data/schedule";
import { weekdays } from "../../../data/schedule";
import type { FrontendLocaleData } from "../../../data/translation";
import type {
  HomeAssistant,
  HomeAssistantApi,
  HomeAssistantConfig,
  HomeAssistantConnection,
  HomeAssistantInternationalization,
} from "../../../types";
import type { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import type {
  CalendarForecastCardFeatureConfig,
  CalendarForecastFocus,
  LovelaceCardFeatureContext,
} from "./types";
import {
  DEFAULT_CALENDAR_FORECAST_FOCUS,
  DEFAULT_CALENDAR_FORECAST_HOURS_TO_SHOW,
} from "./types";

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;

const FETCH_MARGIN = MS_PER_HOUR;

const RETRY_DELAY = 5 * MS_PER_MINUTE;

const SUPPORTED_DOMAINS = ["calendar", "schedule"];

const NOW_POSITION: Record<CalendarForecastFocus, number> = {
  past: 2 / 3,
  present: 1 / 2,
  future: 1 / 3,
};

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const LABEL_STEPS = [1, 2, 3, 4, 6, 8, 12, 24];
const MAX_LABELS = 6;

const LABEL_EDGE_MARGIN = 0.04;

interface TimeSegment {
  start: number;
  end: number;
}

type SegmentLane = "full" | "top" | "bottom";

interface LaidOutSegment extends TimeSegment {
  lane: SegmentLane;
}

interface FetchedRange {
  entityId: string;
  start: number;
  end: number;
}

type ScheduleWeek = Partial<Record<(typeof weekdays)[number], ScheduleDay[]>>;

type ScheduleResponse = Record<string, ScheduleWeek>;

const supportsCalendarForecastCardFeatureFromState = (stateObj: HassEntity) =>
  SUPPORTED_DOMAINS.includes(computeDomain(stateObj.entity_id));

export const supportsCalendarForecastCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  return supportsCalendarForecastCardFeatureFromState(stateObj);
};

const computeLabelStep = (hours: number): number =>
  LABEL_STEPS.find((step) => hours / step <= MAX_LABELS) ??
  LABEL_STEPS[LABEL_STEPS.length - 1];

const labelFormatter = memoizeOne(
  (language: string, amPm: boolean, timeZone: string) =>
    new Intl.DateTimeFormat(language, {
      hour: "numeric",
      hourCycle: amPm ? "h12" : "h23",
      timeZone,
    })
);

const rangeFormatter = memoizeOne(
  (language: string, amPm: boolean, timeZone: string) =>
    new Intl.DateTimeFormat(language, {
      month: "short",
      day: "numeric",
      hour: amPm ? "numeric" : "2-digit",
      minute: "2-digit",
      hourCycle: amPm ? "h12" : "h23",
      timeZone,
    })
);

const isVisible = (segment: TimeSegment, start: number, end: number) =>
  segment.end > start && segment.start < end;

const getRawDate = (
  value: CalendarEventApiData["start"]
): string | undefined => {
  if (typeof value === "string") return value;
  if ("dateTime" in value) return value.dateTime;
  if ("date" in value) return value.date;
  return undefined;
};

const parseCalendarDate = (
  raw: string,
  timeZone: string
): number | undefined => {
  if (DATE_ONLY.test(raw)) {
    const [year, month, day] = raw.split("-").map(Number);
    return new TZDate(year, month - 1, day, timeZone).getTime();
  }
  const time = Date.parse(raw);
  return Number.isNaN(time) ? undefined : time;
};

const mergeSegments = (segments: TimeSegment[]): TimeSegment[] => {
  const sorted = [...segments].sort((a, b) => a.start - b.start);
  const merged: TimeSegment[] = [];
  for (const segment of sorted) {
    const last = merged[merged.length - 1];
    if (last && segment.start <= last.end) {
      last.end = Math.max(last.end, segment.end);
    } else {
      merged.push({ ...segment });
    }
  }
  return merged;
};

const layoutSegments = (
  segments: TimeSegment[],
  start: number,
  end: number
): LaidOutSegment[] => {
  const items = segments
    .filter((segment) => isVisible(segment, start, end))
    .map((segment) => ({
      segment,
      from: Math.max(segment.start, start),
      to: Math.min(segment.end, end),
    }))
    .sort((a, b) => a.from - b.from || a.to - b.to);

  const result: LaidOutSegment[] = [];
  let i = 0;
  while (i < items.length) {
    const group = [items[i]];
    let groupEnd = items[i].to;
    i++;
    while (i < items.length && items[i].from < groupEnd) {
      group.push(items[i]);
      groupEnd = Math.max(groupEnd, items[i].to);
      i++;
    }

    if (group.length === 1) {
      result.push({ ...group[0].segment, lane: "full" });
      continue;
    }

    const lanes: { segment: TimeSegment; to: number }[][] = [[], []];
    for (const item of group) {
      const free = lanes.findIndex(
        (lane) => !lane.length || lane[lane.length - 1].to <= item.from
      );
      const lane = lanes[free === -1 ? 1 : free];
      const last = lane[lane.length - 1];
      if (last && item.from < last.to) {
        last.segment = {
          start: last.segment.start,
          end: Math.max(last.segment.end, item.segment.end),
        };
        last.to = Math.max(last.to, item.to);
      } else {
        lane.push({ segment: { ...item.segment }, to: item.to });
      }
    }
    lanes.forEach((lane, index) =>
      lane.forEach(({ segment }) =>
        result.push({ ...segment, lane: index === 0 ? "top" : "bottom" })
      )
    );
  }
  return result;
};

const toFullLane = (segments: TimeSegment[]): LaidOutSegment[] =>
  segments.map((segment) => ({ ...segment, lane: "full" }));

const parseScheduleTime = (
  day: TZDate,
  time: string,
  timeZone: string
): number => {
  const [hours, minutes, seconds] = time.split(":").map(Number);
  const date = new TZDate(day.getTime(), timeZone);
  date.setHours(hours, minutes || 0, seconds || 0, 0);
  return date.getTime();
};

const expandSchedule = (
  schedule: ScheduleWeek,
  start: number,
  end: number,
  timeZone: string
): TimeSegment[] => {
  const segments: TimeSegment[] = [];
  const day = new TZDate(start, timeZone);
  day.setHours(0, 0, 0, 0);
  while (day.getTime() < end) {
    for (const block of schedule[weekdays[day.getDay()]] ?? []) {
      const blockStart = parseScheduleTime(day, block.from, timeZone);
      const blockEnd = parseScheduleTime(day, block.to, timeZone);
      if (blockEnd > blockStart && blockEnd > start && blockStart < end) {
        segments.push({ start: blockStart, end: blockEnd });
      }
    }
    day.setDate(day.getDate() + 1);
  }
  return mergeSegments(segments);
};

@customElement("hui-calendar-forecast-card-feature")
class HuiCalendarForecastCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @property({ attribute: false }) public color?: string;

  @state()
  @consumeEntityState({ entityIdPath: ["context", "entity_id"] })
  private _stateObj?: HassEntity;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  @transform<HomeAssistantInternationalization, LocalizeFunc>({
    transformer: ({ localize }) => localize,
  })
  private _localize?: LocalizeFunc;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  @transform<HomeAssistantInternationalization, FrontendLocaleData>({
    transformer: ({ locale }) => locale,
  })
  private _locale?: FrontendLocaleData;

  @state()
  @consume({ context: configContext, subscribe: true })
  @transform<HomeAssistantConfig, HassConfig>({
    transformer: ({ config }) => config,
  })
  private _hassConfig?: HassConfig;

  @state()
  @consume({ context: connectionContext, subscribe: true })
  @transform<HomeAssistantConnection, Connection>({
    transformer: ({ connection }) => connection,
  })
  private _connection?: Connection;

  @state()
  @consume({ context: apiContext, subscribe: true })
  private _api?: HomeAssistantApi;

  @state() private _config?: CalendarForecastCardFeatureConfig;

  @state() private _now = Date.now();

  @state() private _segments: TimeSegment[] = [];

  @state() private _allDaySegments: TimeSegment[] = [];

  @state() private _error = false;

  @state() private _loaded = false;

  private _fetchedRange?: FetchedRange;

  private _retryAfter = 0;

  private _unsubCalendar?: Promise<UnsubscribeFunc | undefined>;

  private _request = 0;

  private _interval?: number;

  static getStubConfig(): CalendarForecastCardFeatureConfig {
    return {
      type: "calendar-forecast",
    };
  }

  public static async getConfigElement(): Promise<LovelaceCardFeatureEditor> {
    await import("../editor/config-elements/hui-calendar-forecast-card-feature-editor");
    return document.createElement(
      "hui-calendar-forecast-card-feature-editor"
    ) as LovelaceCardFeatureEditor;
  }

  public setConfig(config: CalendarForecastCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  public connectedCallback() {
    super.connectedCallback();
    this._now = Date.now();
    this._interval = window.setInterval(() => {
      this._now = Date.now();
      this._refreshData();
    }, MS_PER_MINUTE);
    if (this.hasUpdated) {
      this._refreshData();
    }
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = undefined;
    }
    this._resetData();
  }

  protected updated(changedProps: PropertyValues) {
    if (changedProps.has("_config") || changedProps.has("context")) {
      this._resetData();
    }

    if (changedProps.has("_hassConfig")) {
      const oldConfig = changedProps.get("_hassConfig") as
        HassConfig | undefined;
      if (oldConfig && oldConfig.time_zone !== this._hassConfig?.time_zone) {
        this._resetData();
      }
    }
    if (changedProps.has("_locale")) {
      const oldLocale = changedProps.get("_locale") as
        FrontendLocaleData | undefined;
      if (oldLocale && oldLocale.time_zone !== this._locale?.time_zone) {
        this._resetData();
      }
    }

    let force = false;
    const entityId = this.context?.entity_id;
    if (
      changedProps.has("_stateObj") &&
      entityId &&
      computeDomain(entityId) === "schedule"
    ) {
      const oldStateObj = changedProps.get("_stateObj") as
        HassEntity | undefined;
      force = oldStateObj !== undefined && oldStateObj !== this._stateObj;
    }

    this._refreshData(force);
  }

  private _computeWindow(now: number) {
    const configuredHours = this._config?.hours_to_show;
    const hours =
      configuredHours && configuredHours > 0
        ? configuredHours
        : DEFAULT_CALENDAR_FORECAST_HOURS_TO_SHOW;
    const nowPosition =
      NOW_POSITION[this._config?.focus ?? DEFAULT_CALENDAR_FORECAST_FOCUS] ??
      NOW_POSITION[DEFAULT_CALENDAR_FORECAST_FOCUS];
    const duration = hours * MS_PER_HOUR;
    const start = now - duration * nowPosition;
    return { start, end: start + duration, nowPosition };
  }

  private _unsubscribeCalendar() {
    if (this._unsubCalendar) {
      this._unsubCalendar.then((unsub) => unsub?.()).catch(() => undefined);
      this._unsubCalendar = undefined;
    }
  }

  private _resetData() {
    this._unsubscribeCalendar();
    this._request++;
    this._fetchedRange = undefined;
    this._retryAfter = 0;
    this._error = false;
    this._loaded = false;
    this._segments = [];
    this._allDaySegments = [];
  }

  private _handleFetchError(request: number) {
    if (request !== this._request) return;
    this._fetchedRange = undefined;
    this._retryAfter = Date.now() + RETRY_DELAY;
    this._error = true;
    this._loaded = true;
    this._segments = [];
    this._allDaySegments = [];
  }

  private _refreshData(force = false) {
    const entityId = this.context?.entity_id;
    if (
      !this.isConnected ||
      !this._config ||
      !this._hassConfig ||
      !this._locale ||
      !entityId ||
      !this._stateObj
    ) {
      return;
    }

    const isCalendar = computeDomain(entityId) === "calendar";
    if (isCalendar ? !this._connection : !this._api) {
      return;
    }

    if (!force && Date.now() < this._retryAfter) {
      return;
    }

    const { start, end } = this._computeWindow(Date.now());
    const fetched = this._fetchedRange;
    if (
      !force &&
      fetched &&
      fetched.entityId === entityId &&
      fetched.start <= start &&
      fetched.end >= end
    ) {
      return;
    }

    const range: FetchedRange = {
      entityId,
      start: start - FETCH_MARGIN,
      end: end + FETCH_MARGIN,
    };
    this._fetchedRange = range;
    this._retryAfter = 0;

    if (isCalendar) {
      this._subscribeCalendar(range);
    } else {
      this._fetchSchedule(range);
    }
  }

  private _subscribeCalendar(range: FetchedRange) {
    this._unsubscribeCalendar();
    const request = ++this._request;
    this._unsubCalendar = subscribeCalendarEvents(
      { connection: this._connection! },
      range.entityId,
      new Date(range.start),
      new Date(range.end),
      (update) => {
        if (request !== this._request) return;
        if (update.events === null) {
          this._handleFetchError(request);
          return;
        }
        this._setCalendarEvents(update.events);
      }
    ).catch(() => {
      this._handleFetchError(request);
      return undefined;
    });
  }

  private _setCalendarEvents(events: CalendarEventApiData[]) {
    const timeZone = resolveTimeZone(
      this._locale!.time_zone,
      this._hassConfig!.time_zone
    );
    const timed: TimeSegment[] = [];
    const allDay: TimeSegment[] = [];
    for (const event of events) {
      const rawStart = getRawDate(event.start);
      const rawEnd = getRawDate(event.end);
      if (!rawStart || !rawEnd) continue;
      const start = parseCalendarDate(rawStart, timeZone);
      const end = parseCalendarDate(rawEnd, timeZone);
      if (start === undefined || end === undefined || end <= start) continue;
      const isAllDay = event.all_day ?? DATE_ONLY.test(rawStart);
      (isAllDay ? allDay : timed).push({ start, end });
    }
    this._error = false;
    this._loaded = true;
    this._segments = timed;
    this._allDaySegments = mergeSegments(allDay);
  }

  private async _fetchSchedule(range: FetchedRange) {
    const request = ++this._request;
    try {
      const result = await this._api!.callService<ScheduleResponse>(
        "schedule",
        "get_schedule",
        undefined,
        { entity_id: range.entityId },
        false,
        true
      );
      if (request !== this._request) return;
      const schedule = result.response?.[range.entityId];
      this._error = false;
      this._loaded = true;
      this._segments = schedule
        ? expandSchedule(
            schedule,
            range.start,
            range.end,
            this._hassConfig!.time_zone
          )
        : [];
      this._allDaySegments = [];
    } catch (_err) {
      this._handleFetchError(request);
    }
  }

  protected render() {
    if (
      !this._config ||
      !this.context ||
      !this._stateObj ||
      !this._locale ||
      !this._hassConfig ||
      !this._localize ||
      !supportsCalendarForecastCardFeatureFromState(this._stateObj)
    ) {
      return nothing;
    }

    if (this._error) {
      return html`
        <div class="info">
          ${this._localize(
            "ui.panel.lovelace.editor.features.types.calendar-forecast.failed_to_load"
          )}
        </div>
      `;
    }

    const { start, end, nowPosition } = this._computeWindow(this._now);
    const duration = end - start;

    const eventColor =
      this.color && this.color !== "state"
        ? computeCssColor(this.color)
        : stateColorCss(this._stateObj, "on");

    return html`
      <div
        class="track"
        role="img"
        aria-label=${this._computeAriaLabel(start, end)}
        style=${styleMap({ "--event-color": eventColor })}
      >
        ${
          this._config.show_all_day_events
            ? this._renderSegments(
                toFullLane(this._allDaySegments),
                start,
                duration,
                true
              )
            : nothing
        }
        ${this._renderSegments(
          layoutSegments(this._segments, start, end),
          start,
          duration,
          false
        )}
        <div
          class="now"
          style=${styleMap({ "inset-inline-start": `${nowPosition * 100}%` })}
        ></div>
      </div>
      ${
        this._config.show_labels !== false
          ? this._renderLabels(start, duration)
          : nothing
      }
    `;
  }

  private _computeAriaLabel(start: number, end: number): string {
    const locale = this._locale!;
    const localize = this._localize!;
    if (!this._loaded) {
      return localize(
        "ui.panel.lovelace.editor.features.types.calendar-forecast.loading"
      );
    }
    const formatter = rangeFormatter(
      locale.language,
      useAmPm(locale),
      resolveTimeZone(locale.time_zone, this._hassConfig!.time_zone)
    );

    const items = this._segments
      .filter((segment) => isVisible(segment, start, end))
      .sort((a, b) => a.start - b.start)
      .map((segment) =>
        formatter.formatRange(
          Math.max(segment.start, start),
          Math.min(segment.end, end)
        )
      );

    if (
      this._config?.show_all_day_events &&
      this._allDaySegments.some((segment) => isVisible(segment, start, end))
    ) {
      items.unshift(
        localize(
          "ui.panel.lovelace.editor.features.types.calendar-forecast.all_day"
        )
      );
    }

    if (!items.length) {
      return localize(
        "ui.panel.lovelace.editor.features.types.calendar-forecast.no_events"
      );
    }
    return localize(
      "ui.panel.lovelace.editor.features.types.calendar-forecast.events",
      { events: items.join(", ") }
    );
  }

  private _renderSegments(
    segments: LaidOutSegment[],
    start: number,
    duration: number,
    allDay: boolean
  ) {
    const end = start + duration;
    const overflow = duration / 2;
    return segments
      .filter((segment) => isVisible(segment, start, end))
      .map((segment) => {
        const from = Math.max(segment.start, start - overflow);
        const to = Math.min(segment.end, end + overflow);
        const width = ((to - from) / duration) * 100;
        return html`
          <div
            class="segment lane-${segment.lane} ${allDay ? "all-day" : ""}"
            style=${styleMap({
              "inset-inline-start": `${((from - start) / duration) * 100}%`,
              width: `max(calc(${width}% - var(--segment-gap)), 2px)`,
            })}
          ></div>
        `;
      });
  }

  private _renderLabels(start: number, duration: number): TemplateResult {
    const end = start + duration;
    const step = computeLabelStep(duration / MS_PER_HOUR);
    const locale = this._locale!;
    const timeZone = resolveTimeZone(
      locale.time_zone,
      this._hassConfig!.time_zone
    );
    const formatter = labelFormatter(
      locale.language,
      useAmPm(locale),
      timeZone
    );

    const labels: TemplateResult[] = [];
    const time = new TZDate(start, timeZone);
    time.setMinutes(0, 0, 0);
    if (time.getTime() < start) {
      time.setHours(time.getHours() + 1);
    }
    while (time.getTime() <= end) {
      const position = (time.getTime() - start) / duration;
      if (
        time.getHours() % step === 0 &&
        position >= LABEL_EDGE_MARGIN &&
        position <= 1 - LABEL_EDGE_MARGIN
      ) {
        labels.push(html`
          <div
            class="label"
            style=${styleMap({ "inset-inline-start": `${position * 100}%` })}
          >
            ${formatter.format(time)}
          </div>
        `);
      }
      time.setHours(time.getHours() + 1);
    }

    return html`<div class="labels" aria-hidden="true">${labels}</div>`;
  }

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: var(--feature-height);
      pointer-events: none !important;
    }

    .track {
      --segment-gap: 2px;
      position: relative;
      flex: 1;
      min-height: 0;
      border-radius: var(--feature-border-radius);
      overflow: hidden;
    }

    .track::before {
      content: "";
      position: absolute;
      inset: 0;
      background-color: var(--disabled-color);
      opacity: 0.2;
    }

    .segment {
      position: absolute;
      top: 0;
      bottom: 0;
      margin-inline-start: calc(var(--segment-gap) / 2);
      border-radius: var(--feature-border-radius);
      background-color: var(--event-color, var(--feature-color));
    }

    .segment.lane-top {
      bottom: calc(50% + var(--segment-gap) / 2);
    }

    .segment.lane-bottom {
      top: calc(50% + var(--segment-gap) / 2);
    }

    .segment.all-day {
      opacity: 0.3;
    }

    .now {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 4px;
      margin-inline-start: -2px;
      border-radius: 2px;
      background-color: var(--white-color, #ffffff);
      box-shadow: 0 0 2px rgba(0, 0, 0, 0.3);
    }

    .info {
      display: flex;
      align-items: center;
      width: 100%;
      height: 100%;
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-s);
    }

    .labels {
      position: relative;
      flex: none;
      height: 14px;
    }

    .label {
      position: absolute;
      top: 0;
      width: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      color: var(--secondary-text-color);
      font-size: 9px;
      line-height: 1;
      white-space: nowrap;
    }

    .label::before {
      content: "";
      width: 1px;
      height: 3px;
      margin-bottom: 2px;
      background-color: var(--secondary-text-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-calendar-forecast-card-feature": HuiCalendarForecastCardFeature;
  }
}
