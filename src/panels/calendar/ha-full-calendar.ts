import type { CalendarOptions } from "@fullcalendar/core";
import { Calendar } from "@fullcalendar/core";
import allLocales from "@fullcalendar/core/locales-all";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import { ResizeController } from "@lit-labs/observers/resize-controller";
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
import memoize from "memoize-one";
import { firstWeekdayIndex } from "../../common/datetime/first_weekday";
import { useAmPm } from "../../common/datetime/use_am_pm";
import { fireEvent } from "../../common/dom/fire_event";
import { supportsFeature } from "../../common/entity/supports-feature";
import type { LocalizeFunc } from "../../common/translations/localize";
import "../../components/ha-button-toggle-group";
import "../../components/ha-fab";
import "../../components/ha-icon-button-next";
import "../../components/ha-icon-button-prev";
import "../../components/ha-button";
import type {
  Calendar as CalendarData,
  CalendarEvent,
} from "../../data/calendar";
import { CalendarEntityFeature } from "../../data/calendar";
import { TimeZone } from "../../data/translation";
import { haStyle } from "../../resources/styles";
import type {
  CalendarViewChanged,
  FullCalendarView,
  HomeAssistant,
  ToggleButton,
} from "../../types";
import { showCalendarEventDetailDialog } from "./show-dialog-calendar-event-detail";
import { showCalendarEventEditDialog } from "./show-dialog-calendar-event-editor";
import "../lovelace/components/hui-warning";

declare global {
  interface HTMLElementTagNameMap {
    "ha-full-calendar": HAFullCalendar;
  }
  interface HASSDomEvents {
    "view-changed": CalendarViewChanged;
  }
}

const defaultFullCalendarConfig: CalendarOptions = {
  headerToolbar: false,
  plugins: [dayGridPlugin, listPlugin, interactionPlugin],
  initialView: "dayGridMonth",
  dayMaxEventRows: true,
  height: "parent",
  handleWindowResize: false,
  locales: allLocales,
  views: {
    listWeek: {
      type: "list",
      duration: { days: 7 },
    },
  },
};

@customElement("ha-full-calendar")
export class HAFullCalendar extends LitElement {
  public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow = false;

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

  private _viewButtons?: ToggleButton[];

  @state() private _activeView = this.initialView;

  // @ts-ignore
  private _resizeController = new ResizeController(this, {
    callback: () => this.calendar?.updateSize(),
  });

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.calendar?.destroy();
    this.calendar = undefined;
    this.renderRoot.querySelector("style[data-fullcalendar]")?.remove();
  }

  connectedCallback(): void {
    super.connectedCallback();
    if (this.hasUpdated && !this.calendar) {
      this._loadCalendar(this._activeView);
    }
  }

  protected render() {
    const viewToggleButtons = this._viewToggleButtons(
      this.views,
      this.hass.localize
    );

    return html`
      ${this.calendar
        ? html`
            ${this.error
              ? html`<hui-warning .hass=${this.hass} severity="warning"
                  >${this.error}</hui-warning
                >`
              : ""}
            <div class="header">
              ${!this.narrow
                ? html`
                    <div class="navigation">
                      <ha-button
                        appearance="filled"
                        size="small"
                        class="today"
                        @click=${this._handleToday}
                        >${this.hass.localize(
                          "ui.components.calendar.today"
                        )}</ha-button
                      >
                      <ha-icon-button-prev
                        .label=${this.hass.localize("ui.common.previous")}
                        class="prev"
                        @click=${this._handlePrev}
                      >
                      </ha-icon-button-prev>
                      <ha-icon-button-next
                        .label=${this.hass.localize("ui.common.next")}
                        class="next"
                        @click=${this._handleNext}
                      >
                      </ha-icon-button-next>
                    </div>
                    <h1>${this.calendar.view.title}</h1>
                    <ha-button-toggle-group
                      .buttons=${viewToggleButtons}
                      .active=${this._activeView}
                      size="small"
                      @value-changed=${this._handleView}
                    ></ha-button-toggle-group>
                  `
                : html`
                    <div class="controls">
                      <h1>${this.calendar.view.title}</h1>
                      <div>
                        <ha-icon-button-prev
                          .label=${this.hass.localize("ui.common.previous")}
                          class="prev"
                          @click=${this._handlePrev}
                        >
                        </ha-icon-button-prev>
                        <ha-icon-button-next
                          .label=${this.hass.localize("ui.common.next")}
                          class="next"
                          @click=${this._handleNext}
                        >
                        </ha-icon-button-next>
                      </div>
                    </div>
                    <div class="controls buttons">
                      <ha-button
                        appearance="plain"
                        size="small"
                        class="today"
                        @click=${this._handleToday}
                        >${this.hass.localize(
                          "ui.components.calendar.today"
                        )}</ha-button
                      >
                      <ha-button-toggle-group
                        .buttons=${viewToggleButtons}
                        .active=${this._activeView}
                        .size=${"small"}
                        @value-changed=${this._handleView}
                      ></ha-button-toggle-group>
                    </div>
                  `}
            </div>
          `
        : ""}

      <div id="calendar"></div>
      ${this._hasMutableCalendars
        ? html`<ha-fab
            slot="fab"
            .label=${this.hass.localize("ui.components.calendar.event.add")}
            extended
            @click=${this._createEvent}
          >
            <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
          </ha-fab>`
        : nothing}
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

    if (changedProps.has("eventDisplay")) {
      this.calendar!.setOption("eventDisplay", this.eventDisplay);
    }

    const oldHass = changedProps.get("hass") as HomeAssistant;

    if (oldHass && oldHass.language !== this.hass.language) {
      this.calendar.setOption("locale", this.hass.language);
    }
  }

  protected firstUpdated(): void {
    this._loadCalendar(this.initialView);
    this._activeView = this.initialView;
  }

  private async _loadCalendar(initialView: FullCalendarView) {
    const luxonPlugin =
      this.hass.locale.time_zone === TimeZone.local
        ? undefined
        : (await import("@fullcalendar/luxon3")).default;

    const config: CalendarOptions = {
      ...defaultFullCalendarConfig,
      plugins:
        this.hass.locale.time_zone === TimeZone.local
          ? defaultFullCalendarConfig.plugins
          : [...defaultFullCalendarConfig.plugins!, luxonPlugin!],
      locale: this.hass.language,
      timeZone:
        this.hass.locale.time_zone === TimeZone.local
          ? "local"
          : this.hass.config.time_zone,
      firstDay: firstWeekdayIndex(this.hass.locale),
      initialView,
      eventDisplay: this.eventDisplay,
      eventTimeFormat: {
        hour: useAmPm(this.hass.locale) ? "numeric" : "2-digit",
        minute: useAmPm(this.hass.locale) ? "numeric" : "2-digit",
        hour12: useAmPm(this.hass.locale),
      },
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

  private _handleEventClick(info): void {
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
      color: info.event.backgroundColor,
      updated: () => {
        this._fireViewChanged();
      },
      canEdit: canEdit,
      canDelete: canDelete,
    });
  }

  private _handleDateClick(info): void {
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
    fireEvent(this, "view-changed", {
      start: this.calendar!.view.activeStart,
      end: this.calendar!.view.activeEnd,
      view: this.calendar!.view.type,
    });
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
      css`
        :host {
          display: flex;
          flex-direction: column;
          --fc-theme-standard-border-color: var(--divider-color);
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 8px;
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

        a {
          color: var(--primary-color);
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
          --mdc-icon-button-size: 32px;
        }

        ha-fab {
          position: absolute;
          bottom: 16px;
          right: 16px;
          inset-inline-end: 16px;
          inset-inline-start: initial;
          z-index: 1;
        }

        #calendar {
          flex-grow: 1;
          background-color: var(
            --ha-card-background,
            var(--card-background-color, white)
          );
          height: var(--calendar-height);
          --fc-neutral-bg-color: var(
            --ha-card-background,
            var(--card-background-color, white)
          );
          --fc-list-event-hover-bg-color: var(
            --ha-card-background,
            var(--card-background-color, white)
          );
          --fc-theme-standard-border-color: var(--divider-color);
          --fc-border-color: var(--divider-color);
          --fc-page-bg-color: var(
            --ha-card-background,
            var(--card-background-color, white)
          );
        }

        a {
          color: inherit !important;
        }

        .fc-theme-standard .fc-scrollgrid {
          border: 1px solid var(--divider-color);
          border-width: var(--calendar-border-width, 1px);
          border-radius: var(
            --calendar-border-radius,
            var(--mdc-shape-small, 4px)
          );
        }

        .fc-theme-standard td {
          border-bottom-left-radius: var(--mdc-shape-small, 4px);
          border-bottom-right-radius: var(--mdc-shape-small, 4px);
        }

        .fc-scrollgrid-section-header td {
          border: none;
        }

        th.fc-col-header-cell.fc-day {
          background-color: var(--table-header-background-color);
          color: var(--primary-text-color);
          font-size: var(--ha-font-size-xs);
          font-weight: var(--ha-font-weight-bold);
          text-transform: uppercase;
        }

        .fc-daygrid-dot-event:hover {
          background-color: inherit;
        }

        .fc-daygrid-day-top {
          text-align: center;
          padding-top: 5px;
          justify-content: center;
        }

        table.fc-scrollgrid-sync-table
          tbody
          tr:first-child
          .fc-daygrid-day-top {
          padding-top: 0;
        }

        a.fc-daygrid-day-number {
          float: none !important;
          font-size: var(--ha-font-size-s);
          cursor: pointer;
        }

        .fc .fc-daygrid-day-number {
          padding: 3px !important;
        }

        .fc .fc-daygrid-day.fc-day-today {
          background: inherit;
        }

        td.fc-day-today .fc-daygrid-day-number {
          height: 26px;
          color: var(--text-primary-color) !important;
          background-color: var(--primary-color);
          border-radius: 50%;
          display: inline-block;
          text-align: center;
          white-space: nowrap;
          width: max-content;
          min-width: 24px;
        }

        .fc-daygrid-day-events {
          margin-top: 4px;
        }

        .fc-event {
          border-radius: 4px;
          line-height: var(--ha-line-height-normal);
          cursor: pointer;
        }

        .fc-daygrid-block-event .fc-event-main {
          padding: 0 1px;
        }

        .fc-day-past .fc-daygrid-day-events {
          opacity: 0.5;
        }

        .fc-icon-x:before {
          font-family: var(--ha-font-family-body);
          content: "X";
        }

        .fc-popover {
          background-color: var(--primary-background-color) !important;
        }

        .fc-popover-header {
          background-color: var(--secondary-background-color) !important;
        }

        .fc-theme-standard .fc-list-day-frame {
          background-color: transparent;
        }

        .fc-list.fc-view,
        .fc-list-event.fc-event td {
          border: none;
        }

        .fc-list-day.fc-day th {
          border-bottom: none;
          border-top: 1px solid var(--fc-theme-standard-border-color, #ddd) !important;
        }

        .fc-list-day-text {
          font-size: var(--ha-font-size-l);
          font-weight: var(--ha-font-weight-normal);
        }

        .fc-list-day-side-text {
          font-size: var(--ha-font-size-l);
          font-weight: var(--ha-font-weight-normal);
          color: var(--primary-color);
        }

        .fc-list-table td,
        .fc-list-day-frame {
          padding-top: 12px;
          padding-bottom: 12px;
        }

        :host([narrow])
          .fc-dayGridMonth-view
          .fc-daygrid-dot-event
          .fc-event-time,
        :host([narrow])
          .fc-dayGridMonth-view
          .fc-daygrid-dot-event
          .fc-event-title {
          display: none;
        }

        :host([narrow]) .fc-dayGridMonth-view .fc-daygrid-event-harness {
          margin-top: 0 !important;
        }

        :host([narrow]) .fc-dayGridMonth-view .fc-daygrid-day-events {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
        }

        :host([narrow]) .fc-dayGridMonth-view .fc-scrollgrid-sync-table {
          overflow: hidden;
        }

        .fc-scroller::-webkit-scrollbar {
          width: 0.4rem;
          height: 0.4rem;
        }

        .fc-scroller::-webkit-scrollbar-thumb {
          -webkit-border-radius: 4px;
          border-radius: 4px;
          background: var(--scrollbar-thumb-color);
        }

        .fc-scroller {
          overflow-y: auto;
          scrollbar-color: var(--scrollbar-thumb-color) transparent;
          scrollbar-width: thin;
        }
      `,
    ];
  }
}
