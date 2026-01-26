import "@home-assistant/webawesome/dist/components/divider/divider";
import { ResizeController } from "@lit-labs/observers/resize-controller";
import { mdiChevronDown, mdiPlus, mdiRefresh } from "@mdi/js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { storage } from "../../common/decorators/storage";
import type { HASSDomEvent } from "../../common/dom/fire_event";
import { computeStateName } from "../../common/entity/compute_state_name";
import "../../components/ha-button";
import "../../components/ha-card";
import "../../components/ha-dropdown";
import "../../components/ha-dropdown-item";
import type { HaDropdownItem } from "../../components/ha-dropdown-item";
import "../../components/ha-icon-button";
import "../../components/ha-list";
import "../../components/ha-list-item";
import "../../components/ha-menu-button";
import "../../components/ha-state-icon";
import "../../components/ha-svg-icon";
import "../../components/ha-two-pane-top-app-bar-fixed";
import type { Calendar, CalendarEvent } from "../../data/calendar";
import { fetchCalendarEvents, getCalendars } from "../../data/calendar";
import { fetchIntegrationManifest } from "../../data/integration";
import { showConfigFlowDialog } from "../../dialogs/config-flow/show-dialog-config-flow";
import { haStyle } from "../../resources/styles";
import type { CalendarViewChanged, HomeAssistant } from "../../types";
import "./ha-full-calendar";

@customElement("ha-panel-calendar")
class PanelCalendar extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ type: Boolean, reflect: true }) public mobile = false;

  @state() private _calendars: Calendar[] = [];

  @state() private _events: CalendarEvent[] = [];

  @state() private _error?: string = undefined;

  @state()
  @storage({
    key: "deSelectedCalendars",
    state: true,
  })
  private _deSelectedCalendars: string[] = [];

  private _start?: Date;

  private _end?: Date;

  private _showPaneController = new ResizeController(this, {
    callback: (entries) => entries[0]?.contentRect.width > 750,
  });

  private _mql?: MediaQueryList;

  public connectedCallback() {
    super.connectedCallback();
    this._mql = window.matchMedia(
      "(max-width: 450px), all and (max-height: 500px)"
    );
    this._mql.addListener(this._setIsMobile);
    this.mobile = this._mql.matches;
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._mql?.removeListener(this._setIsMobile!);
    this._mql = undefined;
  }

  private _setIsMobile = (ev: MediaQueryListEvent) => {
    this.mobile = ev.matches;
  };

  public willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);
    if (!this.hasUpdated) {
      this._calendars = getCalendars(this.hass, this);
    }
  }

  protected render(): TemplateResult {
    const calendarItems = this._calendars.map(
      (selCal) => html`
        <ha-dropdown-item
          type="checkbox"
          @click=${this._requestSelected}
          .value=${selCal.entity_id}
          .checked=${!this._deSelectedCalendars.includes(selCal.entity_id)}
        >
          <ha-state-icon
            slot="icon"
            .hass=${this.hass}
            .stateObj=${selCal}
            style="--icon-primary-color: ${selCal.backgroundColor}"
          ></ha-state-icon>
          ${selCal.name}
        </ha-dropdown-item>
      `
    );
    const showPane = this._showPaneController.value ?? !this.narrow;
    return html`
      <ha-two-pane-top-app-bar-fixed
        .pane=${showPane}
        footer
        .narrow=${this.narrow}
      >
        <ha-menu-button
          slot="navigationIcon"
          .hass=${this.hass}
          .narrow=${this.narrow}
        ></ha-menu-button>

        ${!showPane
          ? html`<ha-dropdown slot="title">
              <ha-button slot="trigger">
                ${this.hass.localize("ui.components.calendar.my_calendars")}
                <ha-svg-icon slot="end" .path=${mdiChevronDown}></ha-svg-icon>
              </ha-button>
              ${calendarItems}
              ${this.hass.user?.is_admin
                ? html`<wa-divider></wa-divider>
                    <ha-dropdown-item @click=${this._addCalendar}>
                      <ha-svg-icon .path=${mdiPlus} slot="icon"></ha-svg-icon>
                      ${this.hass.localize(
                        "ui.components.calendar.create_calendar"
                      )}
                    </ha-dropdown-item>`
                : nothing}
            </ha-dropdown>`
          : html`<div slot="title">
              ${this.hass.localize("ui.components.calendar.my_calendars")}
            </div>`}
        <ha-icon-button
          slot="actionItems"
          .path=${mdiRefresh}
          .label=${this.hass.localize("ui.common.refresh")}
          @click=${this._handleRefresh}
        ></ha-icon-button>
        ${showPane && this.hass.user?.is_admin
          ? html`<ha-list slot="pane" multi}>${calendarItems}</ha-list>
              <ha-list-item
                graphic="icon"
                slot="pane-footer"
                @click=${this._addCalendar}
              >
                <ha-svg-icon .path=${mdiPlus} slot="graphic"></ha-svg-icon>
                ${this.hass.localize("ui.components.calendar.create_calendar")}
              </ha-list-item>`
          : nothing}
        <ha-full-calendar
          .events=${this._events}
          .calendars=${this._calendars}
          .narrow=${this.narrow}
          .initialView=${this.narrow ? "listWeek" : "dayGridMonth"}
          .hass=${this.hass}
          .error=${this._error}
          @view-changed=${this._handleViewChanged}
        ></ha-full-calendar>
      </ha-two-pane-top-app-bar-fixed>
    `;
  }

  private get _selectedCalendars(): Calendar[] {
    return this._calendars
      .filter((selCal) => !this._deSelectedCalendars.includes(selCal.entity_id))
      .map((cal) => cal);
  }

  private async _fetchEvents(
    start: Date | undefined,
    end: Date | undefined,
    calendars: Calendar[]
  ): Promise<{ events: CalendarEvent[]; errors: string[] }> {
    if (!calendars.length || !start || !end) {
      return { events: [], errors: [] };
    }

    return fetchCalendarEvents(this.hass, start, end, calendars);
  }

  private async _requestSelected(ev: Event) {
    ev.stopPropagation();
    const item = ev.currentTarget as HaDropdownItem;
    const entityId = item.value as string;
    const checked = item.checked;

    if (!checked) {
      this._deSelectedCalendars = this._deSelectedCalendars.filter(
        (cal) => cal !== entityId
      );
      const calendar = this._calendars.find(
        (cal) => cal.entity_id === entityId
      );
      if (!calendar) {
        return;
      }
      const result = await this._fetchEvents(this._start, this._end, [
        calendar,
      ]);
      this._events = [...this._events, ...result.events];
      this._handleErrors(result.errors);
    } else {
      this._deSelectedCalendars = [...this._deSelectedCalendars, entityId];
      this._events = this._events.filter(
        (event) => event.calendar !== entityId
      );
    }
  }

  private _addCalendar = async (): Promise<void> => {
    showConfigFlowDialog(this, {
      startFlowHandler: "local_calendar",
      showAdvanced: this.hass.userData?.showAdvanced,
      manifest: await fetchIntegrationManifest(this.hass, "local_calendar"),
      dialogClosedCallback: ({ flowFinished }) => {
        if (flowFinished) {
          this._calendars = getCalendars(this.hass, this);
        }
      },
    });
  };

  private async _handleViewChanged(
    ev: HASSDomEvent<CalendarViewChanged>
  ): Promise<void> {
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
      this._start,
      this._end,
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
        :host {
          display: block;
        }
        ha-full-calendar {
          --calendar-header-padding: 12px;
          --calendar-border-radius: var(--ha-border-radius-square);
          --calendar-border-width: 1px 0;
          height: calc(
            100vh - var(--header-height, 0px) - var(
                --safe-area-inset-top,
                0px
              ) - var(--safe-area-inset-bottom, 0px)
          );
        }
        ha-dropdown ha-button {
          --ha-font-size-m: var(--ha-font-size-l);
        }

        ha-dropdown-item {
          padding-left: 32px;
          --icon-primary-color: var(--ha-color-fill-neutral-loud-resting);
        }

        ha-dropdown-item[aria-checked="true"] {
          --icon-primary-color: var(--primary-color);
        }

        :host([mobile]) {
          padding-left: unset;
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
