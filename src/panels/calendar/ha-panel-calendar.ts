import {
  customElement,
  LitElement,
  property,
  CSSResultArray,
  css,
  TemplateResult,
  html,
  PropertyValues,
} from "lit-element";
import { styleMap } from "lit-html/directives/style-map";

import "@polymer/app-layout/app-header-layout/app-header-layout";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@material/mwc-checkbox";
import "@material/mwc-formfield";

import "../../components/ha-menu-button";
import "../../components/ha-card";
import "../../components/ha-button-menu";
import "./ha-full-calendar";

import type {
  HomeAssistant,
  SelectedCalendar,
  CalendarEvent,
  CalendarViewChanged,
  Calendar,
} from "../../types";
import { haStyle } from "../../resources/styles";
import { HASSDomEvent } from "../../common/dom/fire_event";
import { getCalendars, fetchCalendarEvents } from "../../data/calendar";

@customElement("ha-panel-calendar")
class PanelCalendar extends LitElement {
  @property() public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true })
  public narrow!: boolean;

  @property() private _calendars: SelectedCalendar[] = [];

  @property() private _events: CalendarEvent[] = [];

  private _start?: Date;

  private _end?: Date;

  protected firstUpdated(changedProps: PropertyValues): void {
    super.firstUpdated(changedProps);
    this._calendars = getCalendars(this.hass).map((calendar) => ({
      selected: true,
      calendar,
    }));

    if (!this._start || !this._end) {
      return;
    }

    this._fetchEvents(this._start, this._end, this._selectedCalendars);
  }

  protected render(): TemplateResult {
    return html`
      <app-header-layout has-scrolling-region>
        <app-header fixed slot="header">
          <app-toolbar>
            <ha-menu-button
              .hass=${this.hass}
              .narrow=${this.narrow}
            ></ha-menu-button>
            <div main-title>${this.hass.localize("panel.calendar")}</div>
            <ha-button-menu>
              <ha-icon-button
                slot="trigger"
                icon="hass:dots-vertical"
              ></ha-icon-button>
              <mwc-list-item @click=${this._handleRefresh}
                >${this.hass.localize("ui.common.refresh")}</mwc-list-item
              >
            </ha-button-menu>
          </app-toolbar>
        </app-header>
        <div class="content">
          <div class="calendar-list">
            <div class="calendar-list-header">
              ${this.hass.localize("ui.panel.calendar.my_calendars")}
            </div>
            ${this._calendars.map(
              (selCal) =>
                html`<div>
                  <mwc-formfield .label=${selCal.calendar.name}>
                    <mwc-checkbox
                      style=${styleMap({
                        "--mdc-theme-secondary":
                          selCal.calendar.backgroundColor,
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
            .hass=${this.hass}
            @view-changed=${this._handleViewChanged}
          ></ha-full-calendar>
        </div>
      </app-header-layout>
    `;
  }

  private get _selectedCalendars(): Calendar[] {
    return this._calendars
      .filter((selCal) => selCal.selected)
      .map((cal) => cal.calendar);
  }

  private async _fetchEvents(
    start: Date,
    end: Date,
    calendars: Calendar[]
  ): Promise<CalendarEvent[]> {
    if (!calendars.length) {
      return [];
    }

    return fetchCalendarEvents(this.hass, start, end, calendars);
  }

  private _handleToggle(ev): void {
    this._calendars = this._calendars.map((cal) => {
      if (ev.target.value !== cal.calendar.entity_id) {
        return cal;
      }

      const checked = ev.target.checked;

      if (checked) {
        this._fetchEvents(this._start!, this._end!, [cal.calendar]).then(
          (events) => {
            this._events = [...this._events, ...events];
          }
        );
      } else {
        this._events = this._events.filter(
          (event) => event.calendar !== cal.calendar.entity_id
        );
      }

      cal.selected = checked;
      return cal;
    });
  }

  private _handleViewChanged(ev: HASSDomEvent<CalendarViewChanged>): void {
    this._start = ev.detail.start;
    this._end = ev.detail.end;
    this._fetchEvents(this._start, this._end, this._selectedCalendars).then(
      (events) => {
        this._events = events;
      }
    );
  }

  private _handleRefresh(): void {
    this._fetchEvents(this._start!, this._end!, this._selectedCalendars).then(
      (events) => {
        this._events = events;
      }
    );
  }

  static get styles(): CSSResultArray {
    return [
      haStyle,
      css`
        .content {
          padding: 16px;
          display: flex;
          box-sizing: border-box;
        }

        :host(:not([narrow])) .content {
          height: calc(100vh - 64px);
        }

        .calendar-list {
          padding-right: 16px;
          min-width: 170px;
          flex: 0 0 15%;
          overflow: hidden;
          --mdc-theme-text-primary-on-background: var(--primary-text-color);
        }

        .calendar-list > div {
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

        :host([narrow]) ha-full-calendar {
          height: calc(100vh - 72px);
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
