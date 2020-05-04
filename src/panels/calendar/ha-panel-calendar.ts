import {
  customElement,
  LitElement,
  property,
  CSSResultArray,
  css,
  TemplateResult,
  html,
} from "lit-element";
import { styleMap } from "lit-html/directives/style-map";

import "@polymer/app-layout/app-header-layout/app-header-layout";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@material/mwc-checkbox";
import "@material/mwc-formfield";

import "../../components/ha-menu-button";
import "../../components/ha-card";
import "./ha-full-calendar";

import type {
  HomeAssistant,
  SelectedCalendar,
  CalendarEvent,
  Calendar,
  CalendarViewChanged,
} from "../../types";
import { haStyle } from "../../resources/styles";
import { HASSDomEvent } from "../../common/dom/fire_event";

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

  @property({ type: Boolean, reflect: true })
  public narrow!: boolean;

  @property() private _calendars: SelectedCalendar[] = [];

  @property() private _events: CalendarEvent[] = [];

  private _start?: Date;

  private _end?: Date;

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    if (!this.hass) {
      return;
    }
    this._fetchCalendars();
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
            <div class="calendar-list-header">My Calendars</div>
            ${this._calendars.map(
              (selCal) =>
                html`<div>
                  <mwc-formfield .label=${selCal.calendar.name}>
                    <mwc-checkbox
                      style=${styleMap({
                        "--mdc-theme-secondary": selCal.backgroundColor,
                      })}
                      .value=${selCal.calendar.entity_id}
                      .checked=${selCal.selected}
                      @change=${this._handleToggle}
                    ></mwc-checkbox>
                  </mwc-formfield>
                </div>`
            )}
          </div>
          <ha-full-calendar
            .events=${this._events}
            .narrow=${this.narrow}
            @view-changed=${this._handleViewChanged}
          ></ha-full-calendar>
        </div>
      </app-header-layout>
    `;
  }

  private _fetchCalendars() {
    this.hass
      .callApi<Calendar[]>("GET", "calendars")
      .then((result) => {
        this._calendars = result.map((cal, idx) => ({
          selected: true,
          calendar: cal,
          backgroundColor: `#${palette[idx % palette.length]}`,
        }));
      })
      .then(() => this._fetchData());
  }

  private async _fetchData() {
    if (!this._start || !this._end || !this._calendars.length) {
      return;
    }

    const start = new Date(this._start);
    const end = new Date(this._end);
    const params = encodeURI(
      `?start=${start.toISOString()}&end=${end.toISOString()}`
    );

    const calEvents: CalendarEvent[] = [];
    const promises: Promise<any>[] = [];

    const selectedCals = this._calendars.filter((selCal) => selCal.selected);

    selectedCals.forEach((selCal) => {
      promises.push(
        this.hass.callApi<any[]>(
          "GET",
          `calendars/${selCal.calendar.entity_id}${params}`
        )
      );
    });

    const results = await Promise.all(promises);

    results.forEach((result, idx) => {
      const cal = selectedCals[idx];
      result.forEach((ev) => {
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
          backgroundColor: cal.backgroundColor,
          borderColor: cal.backgroundColor,
        };

        calEvents.push(event);
      });
    });

    this._events = calEvents;
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
    this._calendars = this._calendars.map((cal) => {
      if (ev.target.value === cal.calendar.entity_id) {
        cal.selected = ev.target.checked;
      }
      return cal;
    });
    this._fetchData();
  }

  private _handleViewChanged(ev: HASSDomEvent<CalendarViewChanged>) {
    this._start = ev.detail.start;
    this._end = ev.detail.end;

    console.log(ev.detail.start);
    console.log(ev.detail.end);

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
          overflow: hidden;
        }
        <<<<<<< HEAD =======>>>>>>>990d0e69... Updates .calendar-list > div {
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
        }

        .calendar-list-header {
          font-size: 16px;
          padding: 16px 16px 8px 8px;
        }

        ha-full-calendar {
          flex-grow: 1;
        }

        :host([narrow]) .content {
          flex-direction: column-reverse;
          padding: 8px 0 0 0;
        }
        :host([narrow]) .calendar-list {
          margin-bottom: 24px;
          width: 100%;
          padding-right: 0;
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
