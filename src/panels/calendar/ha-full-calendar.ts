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
import fullcalendarStyle from "@fullcalendar/core/main.min.css";
import daygridStyle from "@fullcalendar/daygrid/main.min.css";
//import timegridStyle from "@fullcalendar/timegrid/main.min.css";
//import listStyle from "@fullcalendar/list/main.min.css";

import "../../components/ha-paper-icon-button-arrow-next";
import "../../components/ha-paper-icon-button-arrow-prev";

class HAFullCalendar extends LitElement {
  public calendar?: Calendar;
  @property() public events = [];

  protected render() {
    return html`
      <ha-card>
        <div class="card-content">
          ${this.calendar
            ? html`
                <div class="side-by-side">
                  <div class="navigation">
                    <ha-paper-icon-button-arrow-prev @click=${this._handlePrev}
                      >Prev</ha-paper-icon-button-arrow-prev
                    >
                    <ha-paper-icon-button-arrow-next @click=${this._handleNext}
                      >Next</ha-paper-icon-button-arrow-next
                    >
                    <mwc-button @click=${this._handleToday}>Today</mwc-button>
                  </div>
                  <h1>
                    ${this.calendar.view.title}
                  </h1>
                  <paper-dropdown-menu label="View">
                    <paper-listbox
                      slot="dropdown-content"
                      selected=${this.calendar.view.type}
                      @iron-select=${this._handleView}
                    >
                      <paper-item .view=${"day"}>Day</paper-item>
                      <paper-item .view=${"dayGridWeek"}>Week</paper-item>
                      <paper-item .view=${"dayGridMonth"}>Month</paper-item>
                    </paper-listbox>
                  </paper-dropdown-menu>
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
      // this.calendar.refetchEvents();
      this.calendar.removeAllEventSources();
      this.calendar.addEventSource(this.events);
    }
  }

  protected firstUpdated() {
    const config = {
      header: false,
      plugins: [dayGridPlugin],
      //events: this._getEvents,
    };

    this.calendar = new Calendar(
      this.shadowRoot!.getElementById("calendar")!,
      config
    );
    this.calendar.render();
  }

  private _handleNext() {
    this.calendar!.next();
    this.requestUpdate();
  }

  private _handlePrev() {
    this.calendar!.prev();
    this.requestUpdate();
  }

  private _handleToday() {
    this.calendar!.today();
    this.requestUpdate();
  }

  private _handleView(ev) {
    this.calendar!.changeView(ev.detail.item.view);
    console.log(ev.detail.item.view);
  }

  private _getEvents(fetchInfo, successCallback) {
    //console.log(fetchInfo);
    successCallback(this.events);
  }

  static get styles(): CSSResult {
    return css`
      .side-by-side {
        display: flex;
      }

      .navigation {
        flex-grow: 0;
        padding-top: 5px;
      }

      h1 {
        text-align: center;
        flex-grow: 1;
        margin-top: 12px;
      }

      paper-dropdown-menu {
        flex-grow: 0;
        position: relative;
        top: -12px;
      }

      ${unsafeCSS(fullcalendarStyle)}
      ${unsafeCSS(daygridStyle)}
      
      .fc-state-highlight {
        opacity: 0;
        border: none;
      }

      .fc-day-header {
        color: #70757a;
        font-size: 11px;
        font-weight: 500;
        line-height: 20px;
        text-transform: uppercase;
      }

      .fc-day-top {
        text-align: center;
      }

      .fc-day-number {
        float: none !important;
      }

      .fc-event {
        border-radius: 4px;
        border: none;
        padding: 4px;
        background-color: var(--primary-color);
      }

      .fc td,
      .fc th {
        border-width: 1px !important;
        padding: 0 !important;
        vertical-align: top !important;
      }

      td.fc-today {
        background: #e1f5fe !important;
      }

      /* Inherits background for each event from Schedule. */
      .fc-event .fc-bg {
        z-index: 1 !important;
        opacity: 0.25 !important;
      }

      /* Normal font weight for the time in each event */
      .fc-time-grid-event .fc-time {
        font-weight: normal !important;
      }

      /* Apply same opacity to all day events */
      .fc-ltr .fc-h-event.fc-not-end,
      .fc-rtl .fc-h-event.fc-not-start {
        opacity: 0.65 !important;
        margin-left: 12px !important;
        padding: 5px !important;
      }

      /* Apply same opacity to all day events */
      .fc-day-grid-event.fc-h-event.fc-event.fc-not-start.fc-end {
        opacity: 0.65 !important;
        margin-left: 12px !important;
        padding: 5px !important;
      }

      /* The active button box is ugly so the active button will have the same appearance of the hover */
      .fc-state-active {
        background-color: rgba(158, 158, 158, 0.2);
      }

      /* Not raised button */
      .fc-state-default {
        box-shadow: None;
      }

      .fc-today {
        background: #e1f5fe;
      }
    `;
  }
}

window.customElements.define("ha-full-calendar", HAFullCalendar);
