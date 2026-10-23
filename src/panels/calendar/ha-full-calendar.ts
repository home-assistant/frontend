import { TZDate } from "@date-fns/tz";
import type {
  CalendarOptions,
  DateClickInfo,
  EventClickInfo,
} from "fullcalendar";
import { Calendar, joinClassNames } from "fullcalendar";
import allLocales from "fullcalendar/locales-all";
import dayGridPlugin from "fullcalendar/daygrid";
import interactionPlugin from "fullcalendar/interaction";
import listPlugin from "fullcalendar/list";
import type { ContextType } from "@lit/context";
import {
  mdiPlus,
  mdiViewAgenda,
  mdiViewDay,
  mdiViewModule,
  mdiViewWeek,
} from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoize from "memoize-one";
import { consume } from "../../common/decorators/consume";
import { firstWeekdayIndex } from "../../common/datetime/first_weekday";
import { resolveTimeZone } from "../../common/datetime/resolve-time-zone";
import { useAmPm } from "../../common/datetime/use_am_pm";
import { fireEvent } from "../../common/dom/fire_event";
import { supportsFeature } from "../../common/entity/supports-feature";
import type { LocalizeFunc } from "../../common/translations/localize";
import "../../components/ha-button";
import "../../components/ha-button-toggle-group";
import "../../components/ha-icon-button-next";
import "../../components/ha-icon-button-prev";
import type {
  Calendar as CalendarData,
  CalendarEvent,
} from "../../data/calendar";
import { CalendarEntityFeature } from "../../data/calendar";
import { internationalizationContext } from "../../data/context";
import { TimeZone } from "../../data/translation";
import {
  fullCalendarStyles,
  fullCalendarTheme,
} from "../../resources/fullcalendar-theme";
import { haStyle } from "../../resources/styles";
import type {
  CalendarViewChanged,
  FullCalendarView,
  HomeAssistant,
  ToggleButton,
} from "../../types";
import "../lovelace/components/hui-warning";
import { showCalendarEventDetailDialog } from "./show-dialog-calendar-event-detail";
import { showCalendarEventEditDialog } from "./show-dialog-calendar-event-editor";

declare global {
  interface HTMLElementTagNameMap {
    "ha-full-calendar": HAFullCalendar;
  }
  interface HASSDomEvents {
    "view-changed": CalendarViewChanged;
  }
}

type EventTimeFormatter = Extract<
  NonNullable<CalendarOptions["eventTimeFormat"]>,
  (...args: any[]) => string
>;

// FullCalendar sorts events by these fields, with times in calendar time
interface EventSortFields {
  allDay: number;
  start: number;
  end: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// FullCalendar draws a timed event within one day as a dot
const isDotEvent = ({ allDay, start, end }: EventSortFields) =>
  !allDay &&
  Math.floor(start / DAY_MS) === Math.floor(Math.max(start, end - 1) / DAY_MS);

const defaultEventOrder = "start,-duration,allDay,title";

const narrowMonthEventOrder = [
  (a: EventSortFields, b: EventSortFields) =>
    Number(isDotEvent(a)) - Number(isDotEvent(b)),
  ...defaultEventOrder.split(","),
] as CalendarOptions["eventOrder"];

const weekTitleFormat: CalendarOptions["titleFormat"] = {
  year: "numeric",
  month: "short",
  day: "numeric",
};

const defaultFullCalendarConfig: CalendarOptions = {
  headerToolbar: false,
  plugins: [fullCalendarTheme, dayGridPlugin, listPlugin, interactionPlugin],
  initialView: "dayGridMonth",
  height: "var(--calendar-height)",
  locales: allLocales,
  viewClass: ({ view }) => `ha-fc-${view.type}`,
  dayHeaderClass: ({ inPopover }) => (inPopover ? "ha-fc-popover-header" : ""),
  dayRowClass: "ha-fc-day-row",
  dayCellClass: ({ isPast, inPopover }) =>
    isPast && !inPopover ? "ha-fc-day-past" : "",
  dayCellTopClass: "ha-fc-day-top",
  dayCellTopInnerClass: ({ isToday }) =>
    joinClassNames("ha-fc-day-number", isToday && "ha-fc-day-number-today"),
  dayCellInnerClass: "ha-fc-day-events",
  eventClass: "ha-fc-event",
  rowEventClass: "ha-fc-row-event",
  rowEventInnerClass: "ha-fc-row-event-inner",
  moreLinkClass: "ha-fc-more-link",
  popoverClass: "ha-fc-popover",
  listDayClass: "ha-fc-list-day",
  listDayHeaderClass: "ha-fc-list-day-header",
  listDayHeaderInnerClass: "ha-fc-list-day-text",
  views: {
    dayGrid: {
      listItemEventClass: "ha-fc-dot-event",
      listItemEventBeforeClass: "ha-fc-dot",
      listItemEventInnerClass: "ha-fc-dot-event-text",
    },
    dayGridWeek: {
      titleFormat: weekTitleFormat,
    },
    list: {
      listItemEventClass: "ha-fc-list-event",
      listItemEventBeforeClass: "ha-fc-dot ha-fc-dot-large",
      listItemEventTimeClass: "ha-fc-list-event-time",
      listItemEventTitleClass: "ha-fc-list-event-title",
    },
    listWeek: {
      type: "list",
      duration: { days: 7 },
      titleFormat: weekTitleFormat,
    },
  },
};

@customElement("ha-full-calendar")
export class HAFullCalendar extends LitElement {
  public hass!: HomeAssistant;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ attribute: "add-fab", type: Boolean }) public addFab = false;

  @property({ attribute: "add-fab-size" }) public addFabSize = "large";

  @property({ attribute: "add-fab-style" }) public addFabStyle = "on_top";

  @property({ attribute: "auto-height", type: Boolean }) public autoHeight =
    false;

  // Hides the title, navigation and view selection, for a fixed view
  @property({ attribute: "hide-header", type: Boolean, reflect: true })
  public hideHeader = false;

  // Extra FullCalendar options, such as list formats for a fixed view
  @property({ attribute: false }) public options?: CalendarOptions;

  @property({ attribute: false }) public events: CalendarEvent[] = [];

  @property({ attribute: false }) public calendars: CalendarData[] = [];

  @property({ attribute: false }) public views: FullCalendarView[] = [
    "dayGridMonth",
    "dayGridWeek",
    "dayGridDay",
    "listWeek",
  ];

  @property({ attribute: false }) public initialView: FullCalendarView =
    "dayGridMonth";

  @property({ attribute: false }) public eventDisplay = "auto";

  @property({ attribute: false }) public error?: string = undefined;

  private calendar?: Calendar;

  private _midnightRefreshTimeout?: number;

  private _viewButtons?: ToggleButton[];

  @state() private _activeView = this.initialView;

  disconnectedCallback(): void {
    this._clearMidnightRefreshTimeout();
    super.disconnectedCallback();
    this.calendar?.destroy();
    this.calendar = undefined;
  }

  connectedCallback(): void {
    super.connectedCallback();
    if (this.hasUpdated && !this.calendar) {
      this._loadCalendar(this._activeView);
    } else if (this.calendar) {
      this._scheduleMidnightRefresh();
    }
  }

  protected render() {
    const viewToggleButtons = this._viewToggleButtons(
      this.views,
      this._i18n.localize
    );

    return html`
      ${
        this.calendar
          ? html`
              ${
                this.error
                  ? html`<hui-warning severity="warning"
                      >${this.error}</hui-warning
                    >`
                  : ""
              }
              <div class="header">
                ${
                  !this.narrow
                    ? html`
                        <div class="navigation">
                          <ha-button
                            appearance="filled"
                            size="s"
                            class="today"
                            @click=${this._handleToday}
                            >${this._i18n.localize(
                              "ui.components.calendar.today"
                            )}</ha-button
                          >
                          <ha-icon-button-prev
                            .label=${this._i18n.localize("ui.common.previous")}
                            class="prev"
                            @click=${this._handlePrev}
                          >
                          </ha-icon-button-prev>
                          <ha-icon-button-next
                            .label=${this._i18n.localize("ui.common.next")}
                            class="next"
                            @click=${this._handleNext}
                          >
                          </ha-icon-button-next>
                        </div>
                        <h1>${this.calendar.view.title}</h1>
                        <div>
                          <ha-button-toggle-group
                            .buttons=${viewToggleButtons}
                            .active=${this._activeView}
                            size="s"
                            no-wrap
                            @value-changed=${this._handleView}
                          ></ha-button-toggle-group>
                          ${
                            this.addFab &&
                            this._hasMutableCalendars &&
                            this.addFabStyle === "header"
                              ? html`<ha-button
                                  size="s"
                                  class="fab-header"
                                  .accessibleLabel=${this._i18n.localize(
                                    "ui.components.calendar.event.add"
                                  )}
                                  @click=${this._createEvent}
                                >
                                  <ha-svg-icon
                                    slot=""
                                    .path=${mdiPlus}
                                  ></ha-svg-icon>
                                </ha-button>`
                              : nothing
                          }
                        </div>
                      `
                    : html`
                        <div class="controls">
                          <h1>${this.calendar.view.title}</h1>
                          <div>
                            <ha-icon-button-prev
                              .label=${this._i18n.localize("ui.common.previous")}
                              class="prev"
                              @click=${this._handlePrev}
                            >
                            </ha-icon-button-prev>
                            <ha-icon-button-next
                              .label=${this._i18n.localize("ui.common.next")}
                              class="next"
                              @click=${this._handleNext}
                            >
                            </ha-icon-button-next>
                          </div>
                        </div>
                        <div class="controls buttons">
                          <ha-button
                            appearance="plain"
                            size="s"
                            class="today"
                            @click=${this._handleToday}
                            >${this._i18n.localize(
                              "ui.components.calendar.today"
                            )}</ha-button
                          >
                          <div>
                            <ha-button-toggle-group
                              .buttons=${viewToggleButtons}
                              .active=${this._activeView}
                              size="s"
                              no-wrap
                              @value-changed=${this._handleView}
                            ></ha-button-toggle-group>
                            ${
                              this.addFab &&
                              this._hasMutableCalendars &&
                              this.addFabStyle === "header"
                                ? html`<ha-button
                                    size="s"
                                    class="fab-header"
                                    .accessibleLabel=${this._i18n.localize(
                                      "ui.components.calendar.event.add"
                                    )}
                                    @click=${this._createEvent}
                                  >
                                    <ha-svg-icon
                                      slot=""
                                      .path=${mdiPlus}
                                    ></ha-svg-icon>
                                  </ha-button>`
                                : nothing
                            }
                          </div>
                        </div>
                      `
                }
              </div>
            `
          : ""
      }

      <div id="calendar"></div>
      ${
        this.addFab &&
        this._hasMutableCalendars &&
        this.addFabStyle !== "header"
          ? html`<ha-button
              size=${this.addFabSize.charAt(0)}
              class=${classMap({ below: this.addFabStyle === "below" })}
              slot="fab"
              @click=${this._createEvent}
            >
              <ha-svg-icon slot="start" .path=${mdiPlus}></ha-svg-icon>
              ${this._i18n.localize("ui.components.calendar.event.add")}
            </ha-button>`
          : nothing
      }
    `;
  }

  public willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);

    if (!this.calendar) {
      return;
    }

    if (changedProps.has("events")) {
      this.calendar.removeAllEventSources();
      this.calendar.addEventSource(this.events);
    }

    if (changedProps.has("views") && !this.views.includes(this._activeView!)) {
      this._activeView =
        this.initialView && this.views.includes(this.initialView)
          ? this.initialView
          : this.views[0];
      this.calendar!.changeView(this._activeView);
      this._fireViewChanged();
    }

    if (changedProps.has("options") && this.options) {
      Object.entries(this.options).forEach(([name, value]) =>
        this.calendar!.setOption(name as keyof CalendarOptions, value)
      );
    }

    if (changedProps.has("eventDisplay")) {
      this.calendar!.setOption("eventDisplay", this.eventDisplay);
    }

    const eventOrder = this._eventOrderOptions(this._activeView!);
    if (
      this.calendar.getOption("eventOrderStrict") !==
      eventOrder.eventOrderStrict
    ) {
      this.calendar.setOption("eventOrder", eventOrder.eventOrder);
      this.calendar.setOption("eventOrderStrict", eventOrder.eventOrderStrict);
    }

    if (changedProps.has("autoHeight")) {
      this.calendar.setOption("height", this._height);
      this.calendar.setOption("dayMaxEventRows", !this.autoHeight);
    }

    const oldI18n = changedProps.get("_i18n") as
      ContextType<typeof internationalizationContext> | undefined;

    if (oldI18n && oldI18n.language !== this._i18n.language) {
      this.calendar.setOption("locale", this._i18n.language);
    }
  }

  protected firstUpdated(): void {
    this._loadCalendar(this.initialView);
    this._activeView = this.initialView;
  }

  private _loadCalendar(initialView: FullCalendarView) {
    const config: CalendarOptions = {
      ...defaultFullCalendarConfig,
      locale: this.hass.language,
      timeZone:
        this.hass.locale.time_zone === TimeZone.local
          ? "local"
          : this.hass.config.time_zone,
      firstDay: firstWeekdayIndex(this.hass.locale),
      initialView,
      height: this._height,
      // Rows grow to fit all events when the height is automatic
      dayMaxEventRows: !this.autoHeight,
      eventDisplay: this.eventDisplay,
      eventTimeFormat: this._formatEventTime,
      ...this._eventOrderOptions(initialView),
      ...this.options,
    };

    config.dateClick = (info) => this._handleDateClick(info);
    config.eventClick = (info) => this._handleEventClick(info);

    this.calendar = new Calendar(
      this.shadowRoot!.getElementById("calendar")!,
      config
    );
    this.calendar!.render();
    this._fireViewChanged();
  }

  private get _height(): CalendarOptions["height"] {
    return this.autoHeight ? "auto" : defaultFullCalendarConfig.height;
  }

  // Narrow month dots wrap below the bars, so every bar is placed before them
  // and no event fills a gap above an earlier one
  private _eventOrderOptions(view: FullCalendarView) {
    const narrowMonth = this.narrow && view === "dayGridMonth";
    return {
      eventOrder: narrowMonth ? narrowMonthEventOrder : defaultEventOrder,
      eventOrderStrict: narrowMonth,
    };
  }

  // Return if there are calendars that support creating events
  private get _hasMutableCalendars(): boolean {
    return this.calendars.some((selCal) => {
      const entityStateObj = this.hass.states[selCal.entity_id];
      return (
        entityStateObj &&
        supportsFeature(entityStateObj, CalendarEntityFeature.CREATE_EVENT)
      );
    });
  }

  private _createEvent(_info) {
    // Logic for selectedDate: In week and day view, use the start of the week or the selected day.
    // If we are in month view, we only use the start of the month, if we are not showing the
    // current actual month, as for that one the current day is automatically highlighted and
    // defaulting to a different day in the event creation dialog would be weird.
    showCalendarEventEditDialog(this, {
      selectedDate:
        this._activeView === "dayGridWeek" ||
        this._activeView === "dayGridDay" ||
        (this._activeView === "dayGridMonth" &&
          this.calendar!.view.currentStart.getMonth() !== new Date().getMonth())
          ? this.calendar!.view.currentStart
          : undefined,
      updated: () => {
        this._fireViewChanged();
      },
    });
  }

  private _handleEventClick(info: EventClickInfo): void {
    const entityStateObj = this.hass.states[info.event.extendedProps.calendar];
    const canEdit =
      entityStateObj &&
      supportsFeature(entityStateObj, CalendarEntityFeature.UPDATE_EVENT);
    const canDelete =
      entityStateObj &&
      supportsFeature(entityStateObj, CalendarEntityFeature.DELETE_EVENT);
    showCalendarEventDetailDialog(this, {
      calendarId: info.event.extendedProps.calendar,
      entry: info.event.extendedProps.eventData,
      color: info.event.color,
      updated: () => {
        this._fireViewChanged();
      },
      canEdit: canEdit,
      canDelete: canDelete,
    });
  }

  private _handleDateClick(info: DateClickInfo): void {
    if (info.view.type !== "dayGridMonth") {
      return;
    }
    this._activeView = "dayGridDay";
    this.calendar!.changeView("dayGridDay");
    this.calendar!.gotoDate(info.dateStr);
    this._fireViewChanged();
  }

  private _handleNext(): void {
    this.calendar!.next();
    this._fireViewChanged();
  }

  private _handlePrev(): void {
    this.calendar!.prev();
    this._fireViewChanged();
  }

  private _handleToday(): void {
    this.calendar!.today();
    this._fireViewChanged();
  }

  private _handleView(ev: CustomEvent): void {
    this._activeView = ev.detail.value;
    this.calendar!.changeView(this._activeView!);
    this._fireViewChanged();
  }

  private _fireViewChanged(): void {
    this._scheduleMidnightRefresh();
    fireEvent(this, "view-changed", {
      start: this.calendar!.view.activeStart,
      end: this.calendar!.view.activeEnd,
      view: this.calendar!.view.type,
    });
  }

  private _scheduleMidnightRefresh(): void {
    this._clearMidnightRefreshTimeout();

    if (!this.calendar) {
      return;
    }

    const wasShowingToday = this._isShowingToday();
    const nextMidnight = new TZDate(new Date(), this._calendarTimeZone());
    nextMidnight.setHours(24, 0, 0, 0);
    const delay = nextMidnight.getTime() - Date.now();

    // Guard against a NaN/negative delay (e.g. Intl longOffset unsupported on
    // Chromium < 95) so the midnight refresh can't fire in a tight loop (#54182).
    if (!Number.isFinite(delay) || delay <= 0) {
      return;
    }

    this._midnightRefreshTimeout = window.setTimeout(() => {
      if (wasShowingToday) {
        this.calendar?.today();
        this._fireViewChanged();
        return;
      }

      this._scheduleMidnightRefresh();
    }, delay);
  }

  private _clearMidnightRefreshTimeout(): void {
    if (this._midnightRefreshTimeout === undefined) {
      return;
    }

    window.clearTimeout(this._midnightRefreshTimeout);
    this._midnightRefreshTimeout = undefined;
  }

  private _isShowingToday(): boolean {
    const calendarDate = this.calendar?.getDate();

    if (!calendarDate) {
      return false;
    }

    return (
      this._formatDateInCalendarTimeZone(calendarDate) ===
      this._formatDateInCalendarTimeZone(new Date())
    );
  }

  // FullCalendar 7 drops the space before AM/PM and shortens time ranges
  private _formatEventTime: EventTimeFormatter = ({
    start,
    end,
    localeCodes,
    timeZone,
  }) => {
    const formatter = this._eventTimeFormatter(
      localeCodes,
      timeZone,
      useAmPm(this.hass.locale)
    );
    const startText = formatter.format(start.instantMs);
    return end
      ? `${startText} - ${formatter.format(end.instantMs)}`
      : startText;
  };

  private _eventTimeFormatter = memoize(
    (localeCodes: string[], timeZone: string, amPm: boolean) =>
      new Intl.DateTimeFormat(localeCodes, {
        hour: amPm ? "numeric" : "2-digit",
        minute: amPm ? "numeric" : "2-digit",
        hour12: amPm,
        timeZone: timeZone === "local" ? undefined : timeZone,
      })
  );

  private _calendarTimeZone(): string {
    return resolveTimeZone(
      this.hass.locale.time_zone,
      this.hass.config.time_zone
    );
  }

  private _formatDateInCalendarTimeZone(date: Date): string {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: this._calendarTimeZone(),
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }

  private _viewToggleButtons = memoize((views, localize: LocalizeFunc) => {
    if (!this._viewButtons) {
      this._viewButtons = [
        {
          label: localize("ui.components.calendar.views.dayGridMonth"),
          value: "dayGridMonth",
          iconPath: mdiViewModule,
        },
        {
          label: localize("ui.components.calendar.views.dayGridWeek"),
          value: "dayGridWeek",
          iconPath: mdiViewWeek,
        },
        {
          label: localize("ui.components.calendar.views.dayGridDay"),
          value: "dayGridDay",
          iconPath: mdiViewDay,
        },
        {
          label: localize("ui.components.calendar.views.listWeek"),
          value: "listWeek",
          iconPath: mdiViewAgenda,
        },
      ];
    }

    return this._viewButtons.filter((button) =>
      views.includes(button.value as FullCalendarView)
    );
  });

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      fullCalendarStyles,
      css`
        :host {
          display: flex;
          flex-direction: column;
          --fc-classic-today: transparent;
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 8px;
        }

        :host([hide-header]) .header {
          display: none;
        }

        :host([narrow]) .header {
          padding-right: 8px;
          padding-left: 8px;
          padding-inline-start: 8px;
          padding-inline-end: 8px;
          flex-direction: column;
          align-items: flex-start;
          justify-content: initial;
        }

        .header {
          padding-right: var(--calendar-header-padding);
          padding-left: var(--calendar-header-padding);
          padding-inline-start: var(--calendar-header-padding);
          padding-inline-end: var(--calendar-header-padding);
        }

        .navigation {
          display: flex;
          align-items: center;
          flex-grow: 0;
        }

        .controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
        }

        .buttons {
          display: flex;
          flex-wrap: wrap;
        }

        .buttons > * {
          margin-bottom: 5px;
          box-sizing: border-box;
        }

        .today {
          margin-right: 20px;
          margin-inline-end: 20px;
          margin-inline-start: initial;
          direction: var(--direction);
        }

        .prev,
        .next {
          --ha-icon-button-size: 32px;
        }

        ha-button[slot="fab"] {
          position: absolute;
          bottom: var(--ha-space-4);
          right: var(--ha-space-4);
          inset-inline-end: var(--ha-space-4);
          inset-inline-start: initial;
          z-index: 1;
          --ha-button-box-shadow: var(--ha-box-shadow-l);
        }

        ha-button.below[slot="fab"] {
          position: relative;
          margin-inline-start: auto;
          padding-top: var(--ha-space-2);
          left: 0;
          right: 0;
          bottom: 0;
          top: 0;
          --ha-button-box-shadow: none;
        }

        #calendar {
          flex-grow: 1;
          background-color: var(
            --ha-card-background,
            var(--card-background-color, white)
          );
          font-size: inherit;
          line-height: inherit;
        }

        .ha-fc-listWeek {
          border-style: none;
        }

        .ha-fc-day-top {
          justify-content: center;
          padding-top: 5px;
          padding-bottom: 4px;
        }

        .ha-fc-day-top:empty,
        .ha-fc-day-row:first-child .ha-fc-day-top {
          padding-top: 0;
        }

        .ha-fc-day-number {
          margin: 0;
          padding: 3px;
          font-size: var(--ha-font-size-s);
          line-height: var(--ha-line-height-normal);
          cursor: pointer;
        }

        .ha-fc-day-number-today {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 26px;
          min-width: 24px;
          box-sizing: border-box;
          color: var(--text-primary-color);
          background-color: var(--primary-color);
          border-radius: var(--ha-border-radius-circle);
        }

        .ha-fc-day-past .ha-fc-event,
        .ha-fc-day-past .ha-fc-more-link {
          opacity: 0.5;
        }

        .ha-fc-event {
          cursor: pointer;
        }

        .ha-fc-row-event-inner,
        .ha-fc-dot-event-text {
          line-height: var(--ha-line-height-normal);
        }

        .ha-fc-dot-event:hover,
        .ha-fc-list-event:hover {
          background-color: transparent;
        }

        .tentative {
          /* In the text color, so the stripes show on every calendar color */
          --tentative-stripe: color-mix(
            in srgb,
            var(--primary-text-color) 12%,
            transparent
          );
        }

        /* A dot keeps its size and color and gets stripes in the color that
           contrasts with it, 1.5px wide every 4px */
        .tentative > .ha-fc-dot {
          --tentative-dot-stripe: color-mix(
            in srgb,
            var(--fc-event-contrast-color) 80%,
            transparent
          );
          /* A long title would otherwise squeeze the dot into an oval */
          flex-shrink: 0;
          width: var(--fc-classic-small-dot-width);
          height: var(--fc-classic-small-dot-width);
          border: none;
          background-color: var(--fc-event-color);
          background-image: linear-gradient(
            45deg,
            var(--tentative-dot-stripe) 0 9.375%,
            transparent 9.375% 40.625%,
            var(--tentative-dot-stripe) 40.625% 59.375%,
            transparent 59.375% 90.625%,
            var(--tentative-dot-stripe) 90.625%
          );
          background-size: 4px 4px;
          /* Half a tile, so no stripe runs through the middle like a slash */
          background-position: 2px 0;
        }

        .tentative > .ha-fc-dot-large {
          width: var(--fc-classic-large-dot-width);
          height: var(--fc-classic-large-dot-width);
        }

        .ha-fc-row-event.tentative {
          border-color: var(--fc-event-color);
          background-color: color-mix(
            in srgb,
            var(--fc-event-color) 25%,
            transparent
          );
          /* A tile of whole pixels puts every stripe on the same pixels,
             2.8px wide every 14px */
          background-image: linear-gradient(
            45deg,
            var(--tentative-stripe) 0 5%,
            transparent 5% 45%,
            var(--tentative-stripe) 45% 55%,
            transparent 55% 95%,
            var(--tentative-stripe) 95%
          );
          background-size: 14px 14px;
        }

        .tentative > .ha-fc-row-event-inner {
          color: var(--primary-text-color);
        }

        /* Forced colors drop the stripes and the fill of a dot, so a tentative
           event falls back to its outline */
        @media (forced-colors: active) {
          .ha-fc-row-event.tentative {
            border-style: dashed;
          }

          .tentative > .ha-fc-dot {
            box-sizing: border-box;
            border-style: solid;
            border-width: 2px;
          }
        }

        .ha-fc-popover {
          background-color: var(--primary-background-color);
          font-size: inherit;
          line-height: inherit;
        }

        .ha-fc-popover-header {
          background-color: var(--secondary-background-color);
        }

        .ha-fc-list-day {
          border-bottom-style: none;
        }

        .ha-fc-list-day-header {
          margin-bottom: 0;
          border-bottom-style: none;
          border-top: 1px solid var(--divider-color);
          background: var(--fc-classic-background);
        }

        .ha-fc-list-day-text {
          font-size: var(--ha-font-size-l);
          font-weight: var(--ha-font-weight-normal);
        }

        .ha-fc-list-event {
          padding-block: 12px;
          border-top-style: none;
        }

        /* The theme gives the time half the width and cuts titles off, which
           leaves little room for titles on narrow calendars. Times wrap
           instead, so ranges stay readable in the narrower column */
        :host([narrow]) .ha-fc-list-event-time {
          width: 25%;
          white-space: normal;
        }

        :host([narrow]) .ha-fc-list-event-title {
          white-space: normal;
          overflow-wrap: anywhere;
        }

        :host([narrow]) .ha-fc-dayGridMonth .ha-fc-dot-event {
          justify-content: center;
        }

        :host([narrow]) .ha-fc-dayGridMonth .ha-fc-dot-event-text {
          display: none;
        }

        :host([narrow]) .ha-fc-dayGridMonth .ha-fc-more-link {
          justify-content: center;
          border-color: transparent;
        }

        /* Dots sit 4 to a 12px line. FullCalendar stacks each dot 3px below
           the one before it, so a line takes the height it reserves for 4
           dots, and a margin lifts each dot back up to the start of its line.
           Without these selectors the dots stay stacked. Print lays events
           out in normal flow, so this is for screens only. */
        @media screen {
          @supports selector(:nth-child(1 of :has(*))) {
            :host([narrow]) .ha-fc-dayGridMonth .ha-fc-day-events {
              display: flex;
              flex-wrap: wrap;
              justify-content: center;
              align-content: flex-start;
            }

            :host([narrow])
              .ha-fc-dayGridMonth
              .ha-fc-day-events
              > :has(> .ha-fc-dot-event) {
              height: 3px;
            }

            /* FullCalendar hides a dot it has not placed or that does not fit */
            :host([narrow])
              .ha-fc-dayGridMonth
              .ha-fc-day-events
              > :has(> .ha-fc-dot-event):not([style*="hidden"]) {
              position: relative !important;
              width: 25% !important;
              margin-top: calc(var(--dot-column, 0) * -3px);
              margin-bottom: -3px;
            }

            :host([narrow])
              .ha-fc-dayGridMonth
              .ha-fc-day-events
              > :nth-child(4n + 2 of :has(> .ha-fc-dot-event)) {
              --dot-column: 1;
            }

            :host([narrow])
              .ha-fc-dayGridMonth
              .ha-fc-day-events
              > :nth-child(4n + 3 of :has(> .ha-fc-dot-event)) {
              --dot-column: 2;
            }

            :host([narrow])
              .ha-fc-dayGridMonth
              .ha-fc-day-events
              > :nth-child(4n of :has(> .ha-fc-dot-event)) {
              --dot-column: 3;
            }

            /* A last line that is not full still needs the room of 3 dots */
            :host([narrow])
              .ha-fc-dayGridMonth
              .ha-fc-day-events
              > :nth-last-child(1 of :has(> .ha-fc-dot-event)) {
              height: 9px;
            }

            :host([narrow]) .ha-fc-dayGridMonth .ha-fc-more-link {
              padding-top: 6px;
            }
          }
        }
      `,
    ];
  }
}
