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

import "../../components/ha-paper-icon-button-arrow-next";
import "../../components/ha-paper-icon-button-arrow-prev";
import { fireEvent } from "../../common/dom/fire_event";

interface CalendarEvent {
  end?: Date;
  start: Date;
  summary: string;
  title: string;
}

export interface CalendarViewChanged {
  end: Date;
  start: Date;
  view: string;
}

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
  height: "calc(100vh - 190px)",
};

class HAFullCalendar extends LitElement {
  @property() public events: CalendarEvent[] = [];

  @property() private calendar?: Calendar;

  @property({ type: Boolean, reflect: true, attribute: "narrow" })
  public narrow = false;

  protected render() {
    return html`
      <ha-card>
        <div class="card-content">
          ${this.calendar
            ? html`
                <div class="header">
                  <div class="navigation">
                    <mwc-button @click=${this._handleToday}>Today</mwc-button>
                    <ha-paper-icon-button-arrow-prev @click=${this._handlePrev}
                      >Prev</ha-paper-icon-button-arrow-prev
                    >
                    <ha-paper-icon-button-arrow-next @click=${this._handleNext}
                      >Next</ha-paper-icon-button-arrow-next
                    >
                  </div>
                  <div class="title">
                    ${this.calendar.view.title}
                  </div>
                  <div>
                    <paper-dropdown-menu label="View">
                      <paper-listbox
                        slot="dropdown-content"
                        attr-for-selected="view"
                        .selected=${this.calendar.view.type}
                        @iron-select=${this._handleView}
                      >
                        <paper-item .view=${"dayGridDay"}>Day</paper-item>
                        <paper-item .view=${"dayGridWeek"}>Week</paper-item>
                        <paper-item .view=${"dayGridMonth"}>Month</paper-item>
                      </paper-listbox>
                    </paper-dropdown-menu>
                  </div>
                </div>
              `
            : ""}
          <div id="calendar"></div>
        </div>
      </ha-card>
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
    this.calendar!.changeView(ev.detail.item.view);
    this._fireViewChanged();
  }

  private _fireViewChanged() {
    fireEvent(this, "view-changed", {
      start: this.calendar!.view.activeStart,
      end: this.calendar!.view.activeEnd,
      view: this.calendar!.view.type,
    });
  }

  static get styles(): CSSResult {
    return css`
      ${unsafeCSS(fullcalendarStyle)}
      ${unsafeCSS(daygridStyle)}
      

      .header {
        display: flex;
      }

      .header > * {
        display: flex;
        align-items: center;
      }

      .navigation {
        flex-grow: 0;
      }

      .title {
        flex-grow: 1;
        margin-left: 8px;
        font-size: 22px;
        font-weight: 400;
        letter-spacing: 0;
        line-height: 28px;
        white-space: nowrap;
      }

      paper-dropdown-menu {
        flex-grow: 0;
        top: -8px;
        width: 100px;
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

      table.fc-scrollgrid-sync-table tbody tr:first-child .fc-daygrid-day-top {
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
    `;
  }
}

window.customElements.define("ha-full-calendar", HAFullCalendar);
