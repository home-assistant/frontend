import {
  property,
  PropertyValues,
  LitElement,
  CSSResult,
  html,
  css,
  unsafeCSS,
  TemplateResult,
} from "lit-element";
import { Calendar } from "@fullcalendar/core";
import type { CalendarOptions } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
// @ts-ignore
import fullcalendarStyle from "@fullcalendar/common/main.css";
// @ts-ignore
import daygridStyle from "@fullcalendar/daygrid/main.css";
// @ts-ignore
import listStyle from "@fullcalendar/list/main.css";
import "@material/mwc-button";

import "../../components/ha-icon-button";
import "../../components/ha-button-toggle-group";

import type {
  CalendarViewChanged,
  CalendarEvent,
  ToggleButton,
  HomeAssistant,
  FullCalendarView,
} from "../../types";
import { fireEvent } from "../../common/dom/fire_event";
import { haStyle } from "../../resources/styles";

declare global {
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
  eventDisplay: "list-item",
};

const viewButtons: ToggleButton[] = [
  { label: "Month View", value: "dayGridMonth", icon: "hass:view-module" },
  { label: "Week View", value: "dayGridWeek", icon: "hass:view-week" },
  { label: "Day View", value: "dayGridDay", icon: "hass:view-day" },
  { label: "List View", value: "listWeek", icon: "hass:view-agenda" },
];

class HAFullCalendar extends LitElement {
  public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true })
  public narrow!: boolean;

  @property() public events: CalendarEvent[] = [];

  @property() public views: FullCalendarView[] = [
    "dayGridMonth",
    "dayGridWeek",
    "dayGridDay",
  ];

  @property() private calendar?: Calendar;

  @property() private _activeView = "dayGridMonth";

  protected render(): TemplateResult {
    const viewToggleButtons = viewButtons.filter((button) =>
      this.views.includes(button.value as FullCalendarView)
    );

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
                          "ui.panel.calendar.today"
                        )}</mwc-button
                      >
                      <ha-icon-button
                        label=${this.hass.localize("ui.common.previous")}
                        icon="hass:chevron-left"
                        class="prev"
                        @click=${this._handlePrev}
                      >
                      </ha-icon-button>
                      <ha-icon-button
                        label=${this.hass.localize("ui.common.next")}
                        icon="hass:chevron-right"
                        class="next"
                        @click=${this._handleNext}
                      >
                      </ha-icon-button>
                    </div>
                    <h1>
                      ${this.calendar.view.title}
                    </h1>
                    <ha-button-toggle-group
                      .buttons=${viewToggleButtons}
                      .active=${this._activeView}
                      @value-changed=${this._handleView}
                    ></ha-button-toggle-group>
                  `
                : html`
                    <div class="controls">
                      <h1>
                        ${this.calendar.view.title}
                      </h1>
                      <div>
                        <ha-icon-button
                          label=${this.hass.localize("ui.common.previous")}
                          icon="hass:chevron-left"
                          class="prev"
                          @click=${this._handlePrev}
                        >
                        </ha-icon-button>
                        <ha-icon-button
                          label=${this.hass.localize("ui.common.next")}
                          icon="hass:chevron-right"
                          class="next"
                          @click=${this._handleNext}
                        >
                        </ha-icon-button>
                      </div>
                    </div>
                    <div class="controls">
                      <mwc-button
                        outlined
                        class="today"
                        @click=${this._handleToday}
                        >${this.hass.localize(
                          "ui.panel.calendar.today"
                        )}</mwc-button
                      >
                      <ha-button-toggle-group
                        .buttons=${viewToggleButtons}
                        .active=${this._activeView}
                        @value-changed=${this._handleView}
                      ></ha-button-toggle-group>
                    </div>
                  `}
            </div>
          `
        : ""}
      <div id="calendar"></div>
    `;
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    if (!this.calendar) {
      return;
    }

    if (changedProps.has("events")) {
      this.calendar.removeAllEventSources();
      this.calendar.addEventSource(this.events);
    }
  }

  protected firstUpdated(): void {
    const config: CalendarOptions = {
      ...defaultFullCalendarConfig,
      locale: this.hass.language,
    };

    // if (this.narrow) {
    //   // config.views = {
    //   //   dayGridMonth: {
    //   //     eventContent: function (arg) {
    //   //       const italicEl = document.createElement("i");

    //   //       if (arg.event.extendedProps.isUrgent) {
    //   //         italicEl.innerHTML = "urgent event";
    //   //       } else {
    //   //         italicEl.innerHTML = "normal event";
    //   //       }

    //   //       const arrayOfDomNodes = [italicEl];
    //   //       return { domNodes: arrayOfDomNodes };
    //   //     },
    //   //   },
    //   // };
    //   config.dateClick = (info) => {
    //     if (info.view.type !== "dayGridMonth") {
    //       return;
    //     }
    //     this._activeView = "dayGridDay";
    //     this.calendar!.changeView("dayGridDay");
    //     this.calendar!.gotoDate(info.dateStr);
    //   };
    // }

    this.calendar = new Calendar(
      this.shadowRoot!.getElementById("calendar")!,
      // @ts-ignore
      config
    );

    this.calendar!.render();
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

  private _handleView(ev): void {
    this._activeView = ev.detail.value;
    this.calendar!.changeView(this._activeView);
    this._fireViewChanged();
  }

  private _fireViewChanged(): void {
    fireEvent(this, "view-changed", {
      start: this.calendar!.view.activeStart,
      end: this.calendar!.view.activeEnd,
      view: this.calendar!.view.type,
    });
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        ${unsafeCSS(fullcalendarStyle)}
        ${unsafeCSS(daygridStyle)}
        ${unsafeCSS(listStyle)}
        
        :host {
          display: flex;
          flex-direction: column;
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

        .controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
        }

        .today {
          margin-right: 20px;
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
          background-color: var(--card-background-color);
          min-height: 400px;
        }

        .fc-scrollgrid-section-header td {
          border: none;
        }

        th.fc-col-header-cell.fc-day {
          color: #70757a;
          font-size: 11px;
          font-weight: 400;
          text-transform: uppercase;
        }

        .fc-daygrid-day-top {
          text-align: center;
          padding-top: 8px;
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

        td.fc-day-today {
          background: inherit;
        }

        td.fc-day-today .fc-daygrid-day-top {
          padding-top: 4px;
        }

        td.fc-day-today .fc-daygrid-day-number {
          height: 24px;
          color: #fff;
          background-color: #1a73e8;
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
          line-height: 1.7;
        }

        .fc-daygrid-block-event .fc-event-main {
          padding: 0 1px;
        }

        .fc-day-past .fc-daygrid-day-events {
          opacity: 0.5;
        }

        .fc-icon-x:before {
          font-family: var(--material-font-family);
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
          .fc-event-title {
          display: none;
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
      `,
    ];
  }
}

window.customElements.define("ha-full-calendar", HAFullCalendar);
