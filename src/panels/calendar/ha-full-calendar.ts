import {
  property,
  PropertyValues,
  LitElement,
  CSSResult,
  html,
  css,
  unsafeCSS,
  query,
} from "lit-element";
import { Calendar } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
// @ts-ignore
import fullcalendarStyle from "@fullcalendar/core/main.css";
// @ts-ignore
import daygridStyle from "@fullcalendar/daygrid/main.css";
import "@material/mwc-icon-button";
import "@material/mwc-menu";
import "@material/mwc-button";
import "@material/mwc-list/mwc-list-item";
import type { Menu } from "@material/mwc-menu";

import "../../components/ha-icon";

import type { CalendarViewChanged, CalendarEvent } from "../../types";
import { fireEvent } from "../../common/dom/fire_event";
import { ListItemBase } from "@material/mwc-list/mwc-list-item-base";

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

  @property() private calendar?: Calendar;

  @property({ type: Boolean, reflect: true, attribute: "narrow" })
  public narrow = false;

  @query("mwc-menu") private _viewMenu?: Menu;

  protected render() {
    return html`
      <div class="card-content">
        ${this.calendar
          ? html`
              <div class="header">
                <div class="navigation">
                  <mwc-button outlined @click=${this._handleToday}
                    >Today</mwc-button
                  >
                  <mwc-icon-button
                    class="prev"
                    label="Prev"
                    @click=${this._handlePrev}
                  >
                    <ha-icon icon="hass:chevron-left"></ha-icon>
                  </mwc-icon-button>
                  <mwc-icon-button
                    class="next"
                    label="Next"
                    @click=${this._handleNext}
                  >
                    <ha-icon icon="hass:chevron-right"></ha-icon>
                  </mwc-icon-button>
                </div>
                <div class="title">
                  ${this.calendar.view.title}
                </div>
                <div class="view-selection">
                  <mwc-button outlined @click=${this._handleViewButtonClick}>
                    View <ha-icon icon="hass:chevron-down"></ha-icon>
                  </mwc-button>
                  <mwc-menu activatable @selected=${this._handleView}>
                    <mwc-list-item value="dayGridDay">Day</mwc-list-item>
                    <mwc-list-item value="dayGridWeek">Week</mwc-list-item>
                    <mwc-list-item selected activated value="dayGridMonth"
                      >Month</mwc-list-item
                    >
                  </mwc-menu>
                </div>
              </div>
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

  private _handleView() {
    const newView = (this._viewMenu!.selected as ListItemBase).value;

    this.calendar!.changeView(newView);
    this._fireViewChanged();
  }

  private _handleViewButtonClick() {
    this._viewMenu!.open = !this._viewMenu!.open;
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

      .prev {
        margin-right: -4px;
      }

      .next {
        margin-left: -4px;
      }

      .view-selection {
        position: relative;
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
