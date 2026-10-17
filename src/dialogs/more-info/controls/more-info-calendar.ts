import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import type { Calendar } from "../../../data/calendar";
import { getCalendarColors } from "../../../data/calendar";
import { CalendarEventsController } from "../../../data/calendar-events-controller";
import type { ExtEntityRegistryEntry } from "../../../data/entity/entity_registry";
import "../../../panels/calendar/ha-full-calendar";
import type {
  CalendarViewChanged,
  FullCalendarView,
  HomeAssistant,
} from "../../../types";

// Same views as the calendar card, opening on the upcoming events
const VIEWS: FullCalendarView[] = ["dayGridMonth", "dayGridDay", "listWeek"];
const INITIAL_VIEW: FullCalendarView = "listWeek";

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

    return html`
      <ha-full-calendar
        narrow
        auto-height
        .hass=${this.hass}
        .events=${this._events.events}
        .calendars=${this._calendars}
        .views=${VIEWS}
        .initialView=${INITIAL_VIEW}
        .error=${
          this._events.errorCalendars.length
            ? this.hass.localize("ui.components.calendar.event_retrieval_error")
            : undefined
        }
        @view-changed=${this._handleViewChanged}
      ></ha-full-calendar>
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

  static styles = css`
    ha-full-calendar {
      --calendar-title-font-size: var(--ha-font-size-l);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-calendar": MoreInfoCalendar;
  }
}
