import {
  property,
  PropertyValues,
  LitElement,
  CSSResult,
  html,
  css,
  unsafeCSS,
} from "lit-element";
import { Calendar } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
// @ts-ignore
import fullcalendarStyle from "@fullcalendar/core/main.css";
// @ts-ignore
import daygridStyle from "@fullcalendar/daygrid/main.css";
import "@material/mwc-select";
import "@material/mwc-button";
import "@material/mwc-list/mwc-list-item";

import "../../components/ha-icon-button";

import type { CalendarViewChanged, CalendarEvent } from "../../types";
import { fireEvent } from "../../common/dom/fire_event";
import { haStyle } from "../../resources/styles";

declare global {
  interface HASSDomEvents {
    "view-changed": CalendarViewChanged;
  }
}

const fullCalendarConfig = {
  headerToolbar: false,
  plugins: [dayGridPlugin],
  initialView: "dayGridMonth",
  dayMaxEventRows: true,
  height: "calc(100vh - 158px)",
};

class HAFullCalendar extends LitElement {
  @property() public events: CalendarEvent[] = [];

  @property({ type: Boolean, reflect: true })
  public narrow!: boolean;

  @property() private calendar?: Calendar;

  protected render() {
    return html`
      <div class="card-content">
        ${this.calendar
          ? html`
              <div class="header">
                ${!this.narrow
                  ? html` <div class="navigation">
                        <mwc-button outlined @click=${this._handleToday}
                          >Today</mwc-button
                        >
                        <ha-icon-button
                          label="Prev"
                          icon="hass:chevron-left"
                          @click=${this._handlePrev}
                        >
                        </ha-icon-button>
                        <ha-icon-button
                          label="Next"
                          icon="hass:chevron-right"
                          @click=${this._handleNext}
                        >
                        </ha-icon-button>
                      </div>
                      <h1>
                        ${this.calendar.view.title}
                      </h1>`
                  : ""}
                <mwc-select outlined label="view" @change=${this._handleView}>
                  <mwc-list-item value="dayGridDay">Day</mwc-list-item>
                  <mwc-list-item value="dayGridWeek">Week</mwc-list-item>
                  <mwc-list-item selected value="dayGridMonth"
                    >Month</mwc-list-item
                  >
                </mwc-select>
              </div>
              ${this.narrow
                ? html`<div class="header">
                    <div class="navigation">
                      <mwc-button outlined @click=${this._handleToday}
                        >Today</mwc-button
                      >
                      <ha-icon-button
                        label="Prev"
                        icon="hass:chevron-left"
                        @click=${this._handlePrev}
                      >
                      </ha-icon-button>
                      <ha-icon-button
                        label="Next"
                        icon="hass:chevron-right"
                        @click=${this._handleNext}
                      >
                      </ha-icon-button>
                    </div>
                    <h1>
                      ${this.calendar.view.title}
                    </h1>
                  </div>`
                : ""}
            `
          : ""}
        <div id="calendar"></div>
      </div>
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

  protected firstUpdated() {
    this.calendar = new Calendar(
      this.shadowRoot!.getElementById("calendar")!,
      // @ts-ignore
      fullCalendarConfig
    );

    this.calendar!.render();
  }

  private _handleNext() {
    this.calendar!.next();
    this._fireViewChanged();
  }

  private _handlePrev() {
    this.calendar!.prev();
    this._fireViewChanged();
  }

  private _handleToday() {
    this.calendar!.today();
    this._fireViewChanged();
  }

  private _handleView(ev) {
    this.calendar!.changeView(ev.target.value);
    this._fireViewChanged();
  }

  private _fireViewChanged() {
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

      .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 8px;
        }

        :host([narrow]) .header {
          padding-right: 8px;
          padding-left: 8px;
        }

        .navigation {
          display: flex;
          align-items: center;
          flex-grow: 0;
        }

        :host([narrow]) mwc-select {
          width: 100%;
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
      `,
    ];
  }
}

window.customElements.define("ha-full-calendar", HAFullCalendar);
