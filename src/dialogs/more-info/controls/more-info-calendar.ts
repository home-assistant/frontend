import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-spinner";
import type { Calendar } from "../../../data/calendar";
import { getCalendarColors } from "../../../data/calendar";
import { CalendarEventsController } from "../../../data/calendar-events-controller";
import type { ExtEntityRegistryEntry } from "../../../data/entity/entity_registry";
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
          .error=${
            this._events.errorCalendars.length
              ? this.hass.localize(
                  "ui.components.calendar.event_retrieval_error"
                )
              : undefined
          }
          @view-changed=${this._handleViewChanged}
        ></ha-full-calendar>
        ${
          loading
            ? html`<div class="loading"><ha-spinner></ha-spinner></div>`
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

      .loading {
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
