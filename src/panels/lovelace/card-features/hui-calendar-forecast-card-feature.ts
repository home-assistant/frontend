import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { computeDomain } from "../../../common/entity/compute_domain";
import type { CalendarEventApiData } from "../../../data/calendar";
import { subscribeCalendarEvents } from "../../../data/calendar";
import type { ScheduleDay } from "../../../data/schedule";
import { weekdays } from "../../../data/schedule";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature } from "../types";
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

const SUPPORTED_DOMAINS = ["calendar", "schedule"];

const NOW_POSITION: Record<CalendarForecastFocus, number> = {
  past: 2 / 3,
  present: 1 / 2,
  future: 1 / 3,
};

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

interface TimeSegment {
  start: number;
  end: number;
}

interface FetchedRange {
  entityId: string;
  start: number;
  end: number;
}

type ScheduleWeek = Partial<Record<(typeof weekdays)[number], ScheduleDay[]>>;

type ScheduleResponse = Record<string, ScheduleWeek>;

export const supportsCalendarForecastCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  return SUPPORTED_DOMAINS.includes(computeDomain(stateObj.entity_id));
};

const getRawDate = (
  value: CalendarEventApiData["start"]
): string | undefined => {
  if (typeof value === "string") return value;
  if ("dateTime" in value) return value.dateTime;
  if ("date" in value) return value.date;
  return undefined;
};

const parseCalendarDate = (raw: string): number | undefined => {
  if (DATE_ONLY.test(raw)) {
    const [year, month, day] = raw.split("-").map(Number);
    return new Date(year, month - 1, day).getTime();
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

const parseScheduleTime = (day: Date, time: string): number => {
  const [hours, minutes, seconds] = time.split(":").map(Number);
  const date = new Date(day);
  date.setHours(hours, minutes || 0, seconds || 0, 0);
  return date.getTime();
};

const expandSchedule = (
  schedule: ScheduleWeek,
  start: number,
  end: number
): TimeSegment[] => {
  const segments: TimeSegment[] = [];
  const day = new Date(start);
  day.setHours(0, 0, 0, 0);
  while (day.getTime() < end) {
    for (const block of schedule[weekdays[day.getDay()]] ?? []) {
      const blockStart = parseScheduleTime(day, block.from);
      const blockEnd = parseScheduleTime(day, block.to);
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
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: CalendarForecastCardFeatureConfig;

  @state() private _now = Date.now();

  @state() private _segments: TimeSegment[] = [];

  @state() private _allDaySegments: TimeSegment[] = [];

  private _fetchedRange?: FetchedRange;

  private _unsubCalendar?: Promise<UnsubscribeFunc | undefined>;

  private _scheduleRequest = 0;

  private _interval?: number;

  static getStubConfig(): CalendarForecastCardFeatureConfig {
    return {
      type: "calendar-forecast",
    };
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

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (changedProps.size === 1 && changedProps.has("hass")) {
      const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
      const entityId = this.context?.entity_id;
      return (
        !oldHass ||
        !entityId ||
        oldHass.states[entityId] !== this.hass?.states[entityId]
      );
    }
    return true;
  }

  protected updated(changedProps: PropertyValues) {
    if (changedProps.has("_config") || changedProps.has("context")) {
      this._resetData();
    }

    let force = false;
    const entityId = this.context?.entity_id;
    if (
      changedProps.has("hass") &&
      entityId &&
      computeDomain(entityId) === "schedule"
    ) {
      const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
      force =
        oldHass !== undefined &&
        oldHass.states[entityId] !== this.hass?.states[entityId];
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
    this._scheduleRequest++;
    this._fetchedRange = undefined;
    this._segments = [];
    this._allDaySegments = [];
  }

  private _refreshData(force = false) {
    const entityId = this.context?.entity_id;
    if (
      !this.hass ||
      !this._config ||
      !entityId ||
      !this.hass.states[entityId]
    ) {
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

    if (computeDomain(entityId) === "calendar") {
      this._subscribeCalendar(range);
    } else {
      this._fetchSchedule(range);
    }
  }

  private _subscribeCalendar(range: FetchedRange) {
    this._unsubscribeCalendar();
    this._unsubCalendar = subscribeCalendarEvents(
      this.hass!,
      range.entityId,
      new Date(range.start),
      new Date(range.end),
      (update) => this._setCalendarEvents(update.events ?? [])
    ).catch(() => {
      this._segments = [];
      this._allDaySegments = [];
      return undefined;
    });
  }

  private _setCalendarEvents(events: CalendarEventApiData[]) {
    const timed: TimeSegment[] = [];
    const allDay: TimeSegment[] = [];
    for (const event of events) {
      const rawStart = getRawDate(event.start);
      const rawEnd = getRawDate(event.end);
      if (!rawStart || !rawEnd) continue;
      const start = parseCalendarDate(rawStart);
      const end = parseCalendarDate(rawEnd);
      if (start === undefined || end === undefined || end <= start) continue;
      const isAllDay = event.all_day ?? DATE_ONLY.test(rawStart);
      (isAllDay ? allDay : timed).push({ start, end });
    }
    this._segments = mergeSegments(timed);
    this._allDaySegments = mergeSegments(allDay);
  }

  private async _fetchSchedule(range: FetchedRange) {
    const request = ++this._scheduleRequest;
    try {
      const result = await this.hass!.callService<ScheduleResponse>(
        "schedule",
        "get_schedule",
        undefined,
        { entity_id: range.entityId },
        false,
        true
      );
      if (request !== this._scheduleRequest) return;
      const schedule = result.response?.[range.entityId];
      this._segments = schedule
        ? expandSchedule(schedule, range.start, range.end)
        : [];
      this._allDaySegments = [];
    } catch (_err) {
      if (request !== this._scheduleRequest) return;
      this._segments = [];
      this._allDaySegments = [];
    }
  }

  protected render() {
    if (
      !this._config ||
      !this.hass ||
      !this.context ||
      !supportsCalendarForecastCardFeature(this.hass, this.context)
    ) {
      return nothing;
    }

    const { start, end, nowPosition } = this._computeWindow(this._now);
    const duration = end - start;

    return html`
      <div class="track">
        ${
          this._config.show_all_day_events
            ? this._renderSegments(this._allDaySegments, start, duration, true)
            : nothing
        }
        ${this._renderSegments(this._segments, start, duration, false)}
        <div
          class="now"
          style=${styleMap({ "inset-inline-start": `${nowPosition * 100}%` })}
        ></div>
      </div>
    `;
  }

  private _renderSegments(
    segments: TimeSegment[],
    start: number,
    duration: number,
    allDay: boolean
  ) {
    const end = start + duration;
    return segments
      .filter((segment) => segment.end > start && segment.start < end)
      .map((segment) => {
        const from = Math.max(segment.start, start);
        const to = Math.min(segment.end, end);
        return html`
          <div
            class="segment ${allDay ? "all-day" : ""}"
            style=${styleMap({
              "inset-inline-start": `${((from - start) / duration) * 100}%`,
              width: `${((to - from) / duration) * 100}%`,
            })}
          ></div>
        `;
      });
  }

  static styles = css`
    :host {
      display: flex;
      width: 100%;
      height: var(--feature-height);
      pointer-events: none !important;
    }

    .track {
      position: relative;
      flex: 1;
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
      background-color: var(--feature-color);
    }

    .segment.all-day {
      opacity: 0.3;
    }

    .now {
      position: absolute;
      top: 25%;
      bottom: 25%;
      width: 4px;
      margin-inline-start: -2px;
      border-radius: 2px;
      background-color: var(--white-color, #ffffff);
      box-shadow: 0 0 2px rgba(0, 0, 0, 0.3);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-calendar-forecast-card-feature": HuiCalendarForecastCardFeature;
  }
}
