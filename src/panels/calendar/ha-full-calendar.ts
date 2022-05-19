// @ts-ignore
import fullcalendarStyle from "@fullcalendar/common/main.css";
import type { CalendarOptions } from "@fullcalendar/core";
import { Calendar } from "@fullcalendar/core";
import allLocales from "@fullcalendar/core/locales-all";
import dayGridPlugin from "@fullcalendar/daygrid";
// @ts-ignore
import daygridStyle from "@fullcalendar/daygrid/main.css";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
// @ts-ignore
import listStyle from "@fullcalendar/list/main.css";
import "@material/mwc-button";
import { mdiViewAgenda, mdiViewDay, mdiViewModule, mdiViewWeek } from "@mdi/js";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
  unsafeCSS,
} from "lit";
import { property, state } from "lit/decorators";
import memoize from "memoize-one";
import { useAmPm } from "../../common/datetime/use_am_pm";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-button-toggle-group";
import "../../components/ha-icon-button-prev";
import "../../components/ha-icon-button-next";
import { haStyle } from "../../resources/styles";
import { computeRTLDirection } from "../../common/util/compute_rtl";
import type {
  CalendarEvent,
  CalendarViewChanged,
  FullCalendarView,
  HomeAssistant,
  ToggleButton,
} from "../../types";

declare global {
  interface HTMLElementTagNameMap {
    "ha-full-calendar": HAFullCalendar;
  }
  interface HASSDomEvents {
    "view-changed": CalendarViewChanged;
  }
}

const getListWeekRange = (currentDate: Date): { start: Date; end: Date } => {
  const startDate = new Date(currentDate.valueOf());
  const endDate = new Date(currentDate.valueOf());

  endDate.setDate(endDate.getDate() + 7);

  return { start: startDate, end: endDate };
};

const defaultFullCalendarConfig: CalendarOptions = {
  headerToolbar: false,
  plugins: [dayGridPlugin, listPlugin, interactionPlugin],
  initialView: "dayGridMonth",
  dayMaxEventRows: true,
  height: "parent",
  eventDisplay: "list-item",
  locales: allLocales,
  views: {
    list: {
      visibleRange: getListWeekRange,
    },
  },
};

const viewButtons: ToggleButton[] = [
  { label: "Month View", value: "dayGridMonth", iconPath: mdiViewModule },
  { label: "Week View", value: "dayGridWeek", iconPath: mdiViewWeek },
  { label: "Day View", value: "dayGridDay", iconPath: mdiViewDay },
  { label: "List View", value: "list", iconPath: mdiViewAgenda },
];

export class HAFullCalendar extends LitElement {
  public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ attribute: false }) public events: CalendarEvent[] = [];

  @property({ attribute: false }) public views: FullCalendarView[] = [
    "dayGridMonth",
    "dayGridWeek",
    "dayGridDay",
  ];

  @property() public initialView: FullCalendarView = "dayGridMonth";

  private calendar?: Calendar;

  @state() private _activeView = this.initialView;

  public updateSize(): void {
    this.calendar?.updateSize();
  }

  protected render(): TemplateResult {
    const viewToggleButtons = this._viewToggleButtons(this.views);

    return html`
      ${this.calendar
        ? html`
            <div class="header">
              ${!this.narrow
                ? html`
                    <div class="navigation">
                      <mwc-button
                        outlined
                        class="today"
                        @click=${this._handleToday}
                        >${this.hass.localize(
                          "ui.components.calendar.today"
                        )}</mwc-button
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
                      @value-changed=${this._handleView}
                      .dir=${computeRTLDirection(this.hass)}
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
                    <div class="controls">
                      <mwc-button
                        outlined
                        class="today"
                        @click=${this._handleToday}
                        >${this.hass.localize(
                          "ui.components.calendar.today"
                        )}</mwc-button
                      >
                      <ha-button-toggle-group
                        .buttons=${viewToggleButtons}
                        .active=${this._activeView}
                        @value-changed=${this._handleView}
                        .dir=${computeRTLDirection(this.hass)}
                      ></ha-button-toggle-group>
                    </div>
                  `}
            </div>
          `
        : ""}
      <div id="calendar"></div>
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

    const oldHass = changedProps.get("hass") as HomeAssistant;

    if (oldHass && oldHass.language !== this.hass.language) {
      this.calendar.setOption("locale", this.hass.language);
    }
  }

  protected firstUpdated(): void {
    const config: CalendarOptions = {
      ...defaultFullCalendarConfig,
      locale: this.hass.language,
      initialView: this.initialView,
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

  private _handleEventClick(info): void {
    if (info.view.type !== "dayGridMonth") {
      return;
    }

    this._activeView = "dayGridDay";
    this.calendar!.changeView("dayGridDay");
    this.calendar!.gotoDate(info.event.startStr);
  }

  private _handleDateClick(info): void {
    if (info.view.type !== "dayGridMonth") {
      return;
    }
    this._activeView = "dayGridDay";
    this.calendar!.changeView("dayGridDay");
    this.calendar!.gotoDate(info.dateStr);
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

  private _viewToggleButtons = memoize((views) =>
    viewButtons.filter((button) =>
      views.includes(button.value as FullCalendarView)
    )
  );

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ${unsafeCSS(fullcalendarStyle)}
        ${unsafeCSS(daygridStyle)}
        ${unsafeCSS(listStyle)}

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
          flex-direction: column;
          align-items: flex-start;
          justify-content: initial;
        }

        .navigation {
          display: flex;
          align-items: center;
          flex-grow: 0;
        }

        a {
          color: var(--primary-text-color);
        }

        .controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
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

        ha-button-toggle-group {
          color: var(--primary-color);
        }

        #calendar {
          flex-grow: 1;
          background-color: var(
            --ha-card-background,
            var(--card-background-color, white)
          );
          min-height: 400px;
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
        }

        .fc-scrollgrid-section-header td {
          border: none;
        }

        th.fc-col-header-cell.fc-day {
          color: var(--secondary-text-color);
          font-size: 11px;
          font-weight: 400;
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
          font-size: 12px;
        }

        .fc .fc-daygrid-day-number {
          padding: 3px !important;
        }

        .fc .fc-daygrid-day.fc-day-today {
          background: inherit;
        }

        td.fc-day-today .fc-daygrid-day-top {
          padding-top: 4px;
        }

        td.fc-day-today .fc-daygrid-day-number {
          height: 24px;
          color: var(--text-primary-color) !important;
          background-color: var(--primary-color);
          border-radius: 50%;
          display: inline-block;
          text-align: center;
          white-space: nowrap;
          width: max-content;
          min-width: 24px;
          line-height: 140%;
        }

        .fc-daygrid-day-events {
          margin-top: 4px;
        }

        .fc-event {
          border-radius: 4px;
          line-height: 1.7;
        }

        .fc-daygrid-block-event .fc-event-main {
          padding: 0 1px;
        }

        .fc-day-past .fc-daygrid-day-events {
          opacity: 0.5;
        }

        .fc-icon-x:before {
          font-family: var(--paper-font-common-base_-_font-family);
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
          font-size: 16px;
          font-weight: 400;
        }

        .fc-list-day-side-text {
          font-weight: 400;
          font-size: 16px;
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
          .fc-event-title,
        :host([narrow]) .fc-dayGridMonth-view .fc-daygrid-day-bottom {
          display: none;
        }

        :host([narrow])
          .fc
          .fc-dayGridMonth-view
          .fc-daygrid-event-harness-abs {
          visibility: visible !important;
          position: static;
        }

        :host([narrow]) .fc-dayGridMonth-view .fc-daygrid-day-events {
          display: flex;
          min-height: 2em !important;
          justify-content: center;
          flex-wrap: wrap;
          max-height: 2em;
          height: 2em;
          overflow: hidden;
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

window.customElements.define("ha-full-calendar", HAFullCalendar);
