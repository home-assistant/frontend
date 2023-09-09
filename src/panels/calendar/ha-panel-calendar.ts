import "@material/mwc-checkbox";
import "@material/mwc-formfield";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
  nothing,
} from "lit";
import { customElement, property, state, query } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { storage } from "../../common/decorators/storage";
import { HASSDomEvent } from "../../common/dom/fire_event";
import { computeStateName } from "../../common/entity/compute_state_name";
import "../../components/ha-card";
import "../../components/ha-icon-button";
import "../../components/ha-menu-button";
import {
  Calendar,
  CalendarEvent,
  fetchCalendarEvents,
  getCalendars,
} from "../../data/calendar";
import { haStyle } from "../../resources/styles";
import type {
  CalendarViewChanged,
  HomeAssistant,
  FullCalendarView,
} from "../../types";
import "./ha-calendar-app-bar";
import "./ha-full-calendar";
import type { HAFullCalendar } from "./ha-full-calendar";
import "../../components/ha-top-app-bar-fixed";

@customElement("ha-panel-calendar")
class PanelCalendar extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true })
  public narrow!: boolean;

  @state() private _calendars: Calendar[] = [];

  @state() private _events: CalendarEvent[] = [];

  @state() private _error?: string = undefined;

  @storage({
    key: "deSelectedCalendars",
    state: true,
  })
  private _deSelectedCalendars: string[] = [];

  @state() private _dateLabel?: string;

  private _start?: Date;

  private _end?: Date;

  @query("ha-full-calendar") private _calendar?: HAFullCalendar;

  public willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);
    if (!this.hasUpdated) {
      this._calendars = getCalendars(this.hass);
    }
  }

  protected render(): TemplateResult {
    return html`
      <ha-top-app-bar-fixed>
        <ha-menu-button
          slot="navigationIcon"
          .hass=${this.hass}
          .narrow=${this.narrow}
        ></ha-menu-button>
        <div slot="title">${this.hass.localize("panel.calendar")}</div>
        <ha-calendar-app-bar
          .hass=${this.hass}
          .narrow=${this.narrow}
          slot="actionItems"
          .label=${this._dateLabel}
          .controls=${true}
          .navigation=${!this.narrow}
          @prev=${this._handleAppBarClick}
          @next=${this._handleAppBarClick}
          @today=${this._handleAppBarClick}
          @calendar-view-selected=${this._handleAppBarClick}
          @refresh=${this._handleRefresh}
        >
        </ha-calendar-app-bar>
        ${this.narrow
          ? html`<ha-calendar-app-bar
              .hass=${this.hass}
              .narrow=${this.narrow}
              .label=${this._dateLabel}
              .controls=${false}
              .navigation=${true}
              @prev=${this._handleAppBarClick}
              @next=${this._handleAppBarClick}
              @today=${this._handleAppBarClick}
            >
            </ha-calendar-app-bar>`
          : nothing}
        <div class="content">
          <div class="calendar-list">
            <div class="calendar-list-header">
              ${this.hass.localize("ui.components.calendar.my_calendars")}
            </div>
            ${this._calendars.map(
              (selCal) => html`
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
            .calendars=${this._calendars}
            .narrow=${this.narrow}
            .hass=${this.hass}
            .error=${this._error}
            @view-changed=${this._handleViewChanged}
          ></ha-full-calendar>
        </div>
      </ha-top-app-bar-fixed>
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
  ): Promise<{ events: CalendarEvent[]; errors: string[] }> {
    if (!calendars.length) {
      return { events: [], errors: [] };
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
        const result = await this._fetchEvents(this._start!, this._end!, [cal]);
        this._events = [...this._events, ...result.events];
        this._handleErrors(result.errors);
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

  private _handleAppBarClick(ev: Event | HASSDomEvent<FullCalendarView>) {
    switch (ev.type) {
      case "prev":
        this._calendar!.prev();
        break;
      case "next":
        this._calendar!.next();
        break;
      case "today":
        this._calendar!.today();
        break;
      case "calendar-view-selected":
        this._calendar!.changeView(
          (ev as HASSDomEvent<FullCalendarView>).detail
        );
        break;
    }
  }

  private async _handleViewChanged(
    ev: HASSDomEvent<CalendarViewChanged>
  ): Promise<void> {
    this._dateLabel = ev.detail.label;
    this._start = ev.detail.start;
    this._end = ev.detail.end;
    const result = await this._fetchEvents(
      this._start,
      this._end,
      this._selectedCalendars
    );
    this._events = result.events;
    this._handleErrors(result.errors);
  }

  private async _handleRefresh(): Promise<void> {
    const result = await this._fetchEvents(
      this._start!,
      this._end!,
      this._selectedCalendars
    );
    this._events = result.events;
    this._handleErrors(result.errors);
  }

  private _handleErrors(error_entity_ids: string[]) {
    this._error = undefined;
    if (error_entity_ids.length > 0) {
      const nameList = error_entity_ids
        .map((error_entity_id) =>
          this.hass!.states[error_entity_id]
            ? computeStateName(this.hass!.states[error_entity_id])
            : error_entity_id
        )
        .join(", ");

      this._error = `${this.hass!.localize(
        "ui.components.calendar.event_retrieval_error"
      )} ${nameList}`;
    }
  }

  static get styles(): CSSResultGroup {
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
          padding-inline-end: 16px;
          padding-inline-start: initial;
          min-width: 170px;
          flex: 0 0 15%;
          overflow-x: hidden;
          overflow-y: auto;
          --mdc-theme-text-primary-on-background: var(--primary-text-color);
          direction: var(--direction);
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
          padding: 0 0 0 0;
        }

        :host([narrow]) .calendar-list {
          margin-bottom: 24px;
          width: 100%;
          padding-right: 0;
        }

        .ha-calendar-app-bar {
          display: flex;
          width: 100%;
          direction: var(--direction);
          justify-content: flex-end;
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
