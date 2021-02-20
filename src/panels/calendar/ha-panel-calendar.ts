import "@material/mwc-checkbox";
import "@material/mwc-formfield";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import {
  css,
  CSSResultArray,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { styleMap } from "lit-html/directives/style-map";
import { LocalStorage } from "../../common/decorators/local-storage";
import { HASSDomEvent } from "../../common/dom/fire_event";
import "../../components/ha-card";
import "../../components/ha-menu-button";
import {
  Calendar,
  fetchCalendarEvents,
  getCalendars,
} from "../../data/calendar";
import "../../layouts/ha-app-layout";
import { haStyle } from "../../resources/styles";
import type {
  CalendarEvent,
  CalendarViewChanged,
  HomeAssistant,
} from "../../types";
import "./ha-full-calendar";

@customElement("ha-panel-calendar")
class PanelCalendar extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true })
  public narrow!: boolean;

  @internalProperty() private _calendars: Calendar[] = [];

  @internalProperty() private _events: CalendarEvent[] = [];

  @LocalStorage("deSelectedCalendars", true)
  private _deSelectedCalendars: string[] = [];

  private _start?: Date;

  private _end?: Date;

  protected firstUpdated(changedProps: PropertyValues): void {
    super.firstUpdated(changedProps);
    this._calendars = getCalendars(this.hass);
  }

  protected render(): TemplateResult {
    return html`
      <ha-app-layout>
        <app-header fixed slot="header">
          <app-toolbar>
            <ha-menu-button
              .hass=${this.hass}
              .narrow=${this.narrow}
            ></ha-menu-button>
            <div main-title>${this.hass.localize("panel.calendar")}</div>
            <ha-icon-button
              icon="hass:refresh"
              @click=${this._handleRefresh}
            ></ha-icon-button>
          </app-toolbar>
        </app-header>
        <div class="content">
          <div class="calendar-list">
            <div class="calendar-list-header">
              ${this.hass.localize("ui.components.calendar.my_calendars")}
            </div>
            ${this._calendars.map(
              (selCal) =>
                html`
                  <div>
                    <mwc-formfield .label=${selCal.name}>
                      <mwc-checkbox
                        style=${styleMap({
                          "--mdc-theme-secondary": selCal.backgroundColor!,
                        })}
                        .value=${selCal.entity_id}
                        .checked=${!this._deSelectedCalendars.includes(
                          selCal.entity_id
                        )}
                        @change=${this._handleToggle}
                      ></mwc-checkbox>
                    </mwc-formfield>
                  </div>
                `
            )}
          </div>
          <ha-full-calendar
            .events=${this._events}
            .narrow=${this.narrow}
            .hass=${this.hass}
            @view-changed=${this._handleViewChanged}
          ></ha-full-calendar>
        </div>
      </ha-app-layout>
    `;
  }

  private get _selectedCalendars(): Calendar[] {
    return this._calendars
      .filter((selCal) => !this._deSelectedCalendars.includes(selCal.entity_id))
      .map((cal) => cal);
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

  private async _handleToggle(ev): Promise<void> {
    const results = this._calendars.map(async (cal) => {
      if (ev.target.value !== cal.entity_id) {
        return cal;
      }

      const checked = ev.target.checked;

      if (checked) {
        const events = await this._fetchEvents(this._start!, this._end!, [cal]);
        this._events = [...this._events, ...events];
        this._deSelectedCalendars = this._deSelectedCalendars.filter(
          (deCal) => deCal !== cal.entity_id
        );
      } else {
        this._events = this._events.filter(
          (event) => event.calendar !== cal.entity_id
        );
        this._deSelectedCalendars = [
          ...this._deSelectedCalendars,
          cal.entity_id,
        ];
      }

      return cal;
    });

    this._calendars = await Promise.all(results);
  }

  private async _handleViewChanged(
    ev: HASSDomEvent<CalendarViewChanged>
  ): Promise<void> {
    this._start = ev.detail.start;
    this._end = ev.detail.end;
    this._events = await this._fetchEvents(
      this._start,
      this._end,
      this._selectedCalendars
    );
  }

  private async _handleRefresh(): Promise<void> {
    this._events = await this._fetchEvents(
      this._start!,
      this._end!,
      this._selectedCalendars
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
          height: calc(100vh - var(--header-height));
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
