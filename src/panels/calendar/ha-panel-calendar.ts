import { TemplateResult, html } from "lit-html";
/* eslint-disable import/extensions */
import "@polymer/app-layout/app-header-layout/app-header-layout";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/paper-checkbox/paper-checkbox";

import "../../components/ha-menu-button";
import "../../components/ha-card";
import "../../components/ha-checkbox";

import "../../resources/ha-style";
import "./ha-full-calendar";
import {
  customElement,
  LitElement,
  property,
  CSSResultArray,
  css,
} from "lit-element";
import {
  HomeAssistant,
  SelectedCalendar,
  CalendarEvent,
  Calendar,
} from "../../types";
import { haStyle } from "../../resources/styles";
import { HASSDomEvent } from "../../common/dom/fire_event";
import type { CalendarViewChanged } from "./ha-full-calendar";
import { styleMap } from "lit-html/directives/style-map";

const palette = [
  "ff0029",
  "66a61e",
  "377eb8",
  "984ea3",
  "00d2d5",
  "ff7f00",
  "af8d00",
  "7f80cd",
  "b3e900",
  "c42e60",
  "a65628",
  "f781bf",
  "8dd3c7",
  "bebada",
  "fb8072",
  "80b1d3",
  "fdb462",
  "fccde5",
  "bc80bd",
  "ffed6f",
  "c4eaff",
  "cf8c00",
  "1b9e77",
  "d95f02",
  "e7298a",
  "e6ab02",
  "a6761d",
  "0097ff",
  "00d067",
  "f43600",
  "4ba93b",
  "5779bb",
  "927acc",
  "97ee3f",
  "bf3947",
  "9f5b00",
  "f48758",
  "8caed6",
  "f2b94f",
  "eff26e",
  "e43872",
  "d9b100",
  "9d7a00",
  "698cff",
  "d9d9d9",
  "00d27e",
  "d06800",
  "009f82",
  "c49200",
  "cbe8ff",
  "fecddf",
  "c27eb6",
  "8cd2ce",
  "c4b8d9",
  "f883b0",
  "a49100",
  "f48800",
  "27d0df",
  "a04a9b",
];

@customElement("ha-panel-calendar")
class PanelCalendar extends LitElement {
  @property() public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true, attribute: "narrow" })
  public narrow = false;

  @property() private _calendars: SelectedCalendar[] = [];

  @property() private _events: CalendarEvent[] = [];

  private _start?: Date;

  private _end?: Date;

  private _firstUpdate = false;

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    if (!this.hass) {
      return;
    }

    this._fetchCalendars();
  }

  protected updated() {
    if (!this._firstUpdate) {
      this._fetchData();
    }
  }

  protected render(): TemplateResult {
    return html`
      <app-header-layout has-scrolling-region>
        <app-header fixed slot="header"
          ><app-toolbar>
            <ha-menu-button
              .hass=${this.hass}
              .narrow=${this.narrow}
            ></ha-menu-button>
            <div main-title>${this.hass.localize("panel.calendar")}</div>
          </app-toolbar>
        </app-header>
        <div class="content">
          <div class="calendar-list">
            <ha-card header="Calendars">
              ${this._calendars.map(
                (selCal) =>
                  html`<div class="calendar-toggle">
                    <paper-checkbox
                      style=${styleMap({
                        "--primary-color": selCal.backgroundColor,
                      })}
                      .value=${selCal.calendar.entity_id}
                      .checked=${selCal.selected}
                      @change=${this._handleToggle}
                    >
                      ${selCal.calendar.name}</paper-checkbox
                    >
                  </div>`
              )}
            </ha-card>
          </div>
          <ha-full-calendar
            .events=${this._events}
            @view-changed=${this._handleViewChanged}
          ></ha-full-calendar>
        </div>
      </app-header-layout>
    `;
  }

  private _fetchCalendars() {
    this.hass.callApi<Calendar[]>("GET", "calendars").then((result) => {
      this._calendars = result.map((cal, idx) => ({
        selected: true,
        calendar: cal,
        backgroundColor: `#${palette[idx]}`,
      }));
    });
  }

  private _fetchData() {
    if (!this._start || !this._end) {
      return;
    }

    if (!this._firstUpdate && this._calendars.length) {
      this._firstUpdate = true;
    }

    const start = new Date(this._start);
    const end = new Date(this._end);
    const params = encodeURI(
      `?start=${start.toISOString()}&end=${end.toISOString()}`
    );

    const calEvents: CalendarEvent[] = [];
    const calls = new Promise((resolve) => {
      this._calendars
        .filter((selCal) => selCal.selected)
        .forEach(async (selCal, idx) => {
          const events = await this.hass.callApi<any[]>(
            "GET",
            `calendars/${selCal.calendar.entity_id}${params}`
          );
          events.forEach((ev) => {
            const eventStart = this._getDate(ev.start);
            if (!eventStart) {
              return;
            }
            const eventEnd = this._getDate(ev.end);
            const event: CalendarEvent = {
              start: eventStart,
              end: eventEnd,
              title: ev.summary,
              summary: ev.summary,
              backgroundColor: selCal.backgroundColor,
              borderColor: selCal.backgroundColor,
            };

            calEvents.push(event);

            if (idx === this._calendars.filter((c) => c.selected).length - 1) {
              resolve();
            }
          });
        });
    });

    calls.then(() => {
      this._events = calEvents;
    });
  }

  private _getDate(dateObj: any): string | undefined {
    if (typeof dateObj === "string") {
      return dateObj;
    }

    if (dateObj.dateTime) {
      return dateObj.dateTime;
    }

    if (dateObj.date) {
      return dateObj.date;
    }

    return undefined;
  }

  private _handleToggle(ev) {
    const cals = this._calendars.map((cal) => {
      if (ev.target.value === cal.calendar.entity_id) {
        cal.selected = ev.target.checked;
      }
      return cal;
    });
    this._calendars = cals;
    this._fetchData();
  }

  private _handleViewChanged(ev: HASSDomEvent<CalendarViewChanged>) {
    this._start = ev.detail.start;
    this._end = ev.detail.end;
    this._fetchData();
  }

  static get styles(): CSSResultArray {
    return [
      haStyle,
      css`
        .content {
          padding: 16px;
          display: flex;
        }

        .calendar-list {
          padding-right: 16px;
          min-width: 170px;
          flex: 0 0 15%;
        }

        ha-full-calendar {
          flex-grow: 1;
        }

        .calendar-toggle {
          display: flex;
          padding: 0 16px 16px 16px;
        }

        :host([narrow]) .content {
          flex-direction: column-reverse;
          padding: 0;
        }
        :host([narrow]) .calendar-list {
          margin-bottom: 24px;
          width: 100%;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-panel-calendar": PanelCalendar;
  }
}
