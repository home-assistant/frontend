import { TZDate } from "@date-fns/tz";
import type { CalendarOptions } from "fullcalendar";
import { addDays, isSameDay } from "date-fns";
import type { HassConfig, HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import { formatDateWeekdayDay } from "../../../common/datetime/format_date";
import { resolveTimeZone } from "../../../common/datetime/resolve-time-zone";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-spinner";
import type { Calendar } from "../../../data/calendar";
import { getCalendarColors } from "../../../data/calendar";
import { CalendarEventsController } from "../../../data/calendar-events-controller";
import type { ExtEntityRegistryEntry } from "../../../data/entity/entity_registry";
import type { FrontendLocaleData } from "../../../data/translation";
import "../../../panels/calendar/ha-full-calendar";
import { haStyle } from "../../../resources/styles";
import type {
  CalendarViewChanged,
  FullCalendarView,
  HomeAssistant,
} from "../../../types";

// A fixed list of the next 7 days, the calendar panel has the other views
const VIEWS: FullCalendarView[] = ["listWeek"];

@customElement("more-info-calendar")
class MoreInfoCalendar extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  @property({ attribute: false }) public entry?: ExtEntityRegistryEntry | null;

  private _events = new CalendarEventsController(this);

  private _start?: Date;

  private _end?: Date;

  private _calendars: Calendar[] = [];

  protected willUpdate(changedProps: PropertyValues<this>): void {
    super.willUpdate(changedProps);
    if (!this.stateObj) {
      return;
    }
    const calendars = this._computeCalendars(
      this.stateObj.entity_id,
      this.entry?.options?.calendar?.color,
      this.hass.themes?.theme,
      this.hass.themes?.darkMode
    );
    if (calendars !== this._calendars) {
      this._calendars = calendars;
      // Events carry the calendar colors, so they are fetched again
      if (this._start) {
        this._subscribe();
      }
    }
  }

  protected render() {
    if (!this.stateObj) {
      return nothing;
    }

    // Hidden until every calendar has answered, so the list view does not
    // show "No events to display" while the events are still loading.
    const loading = !this._events.loaded;

    return html`
      <div class="header">
        <h2>
          ${this.hass.localize(
            "ui.dialogs.more_info_control.calendar.upcoming_events"
          )}
        </h2>
        <a href="/calendar"
          >${this.hass.localize("ui.dialogs.more_info_control.show_more")}</a
        >
      </div>
      <div class="content">
        <ha-full-calendar
          class=${classMap({ loading })}
          narrow
          auto-height
          hide-header
          .hass=${this.hass}
          .events=${this._events.events}
          .calendars=${this._calendars}
          .views=${VIEWS}
          .initialView=${VIEWS[0]}
          .options=${this._calendarOptions(
            this.hass.localize,
            this.hass.locale,
            this.hass.config,
            this._events.errorCalendars.length > 0
          )}
          @view-changed=${this._handleViewChanged}
        ></ha-full-calendar>
        ${
          loading
            ? html`<div class="spinner"><ha-spinner></ha-spinner></div>`
            : nothing
        }
      </div>
    `;
  }

  // The colors are resolved against the theme, so they are computed again
  // when it changes.
  private _computeCalendars = memoizeOne(
    (
      entityId: string,
      color: string | null | undefined,
      _theme: string | undefined,
      _darkMode: boolean | undefined
    ): Calendar[] => [
      {
        entity_id: entityId,
        ...getCalendarColors(color, 0, getComputedStyle(this)),
      },
    ]
  );

  // Days are titled "Today", "Tomorrow" and then by weekday and date, with
  // only the start time of events to leave room for their titles.
  private _calendarOptions = memoizeOne(
    (
      localize: LocalizeFunc,
      locale: FrontendLocaleData,
      config: HassConfig,
      error: boolean
    ): CalendarOptions => {
      const timeZone = resolveTimeZone(locale.time_zone, config.time_zone);
      return {
        displayEventEnd: false,
        // FullCalendar 7 shows the default date for `false`, so format it empty
        listDayAltFormat: () => "",
        listDayFormat: ({ date }) => {
          const day = new TZDate(date.year, date.month, date.day, timeZone);
          const today = TZDate.tz(timeZone);
          if (isSameDay(day, today)) {
            return localize("ui.dialogs.more_info_control.calendar.today");
          }
          if (isSameDay(day, addDays(today, 1))) {
            return localize("ui.dialogs.more_info_control.calendar.tomorrow");
          }
          return formatDateWeekdayDay(day, locale, config);
        },
        // The dialog shows one calendar, so an error means it has no events
        noEventsContent: localize(
          error
            ? "ui.dialogs.more_info_control.calendar.event_retrieval_error"
            : "ui.dialogs.more_info_control.calendar.no_events"
        ),
      };
    }
  );

  private _handleViewChanged(ev: HASSDomEvent<CalendarViewChanged>): void {
    this._start = ev.detail.start;
    this._end = ev.detail.end;
    this._subscribe();
  }

  private async _subscribe(): Promise<void> {
    await this._events.unsubscribeAll();
    if (!this._start || !this._end) {
      return;
    }
    this._events.subscribe(this.hass, this._calendars, this._start, this._end);
  }

  static styles = [
    haStyle,
    css`
      .content {
        position: relative;
      }

      ha-full-calendar.loading {
        visibility: hidden;
      }

      .spinner {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--ha-space-2);
      }

      h2 {
        margin: 0;
      }

      a {
        color: var(--primary-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-calendar": MoreInfoCalendar;
  }
}
