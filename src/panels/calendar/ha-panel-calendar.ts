import { ResizeController } from "@lit-labs/observers/resize-controller";
import type { RequestSelectedDetail } from "@material/mwc-list/mwc-list-item";
import { mdiChevronDown, mdiPlus, mdiRefresh } from "@mdi/js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { storage } from "../../common/decorators/storage";
import type { HASSDomEvent } from "../../common/dom/fire_event";
import { computeStateName } from "../../common/entity/compute_state_name";
import "../../components/ha-button";
import "../../components/ha-button-menu";
import "../../components/ha-card";
import "../../components/ha-check-list-item";
import "../../components/ha-icon-button";
import "../../components/ha-list";
import "../../components/ha-list-item";
import type { HaListItem } from "../../components/ha-list-item";
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

  private _headerHeight = 56;

  public connectedCallback() {
    super.connectedCallback();
    this._mql = window.matchMedia(
      "(max-width: 450px), all and (max-height: 500px)"
    );
    this._mql.addListener(this._setIsMobile);
    this.mobile = this._mql.matches;
    const computedStyles = getComputedStyle(this);
    this._headerHeight = Number(
      computedStyles.getPropertyValue("--header-height").replace("px", "")
    );
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
      this._calendars = getCalendars(this.hass);
    }
  }

  protected render(): TemplateResult {
    const calendarItems = this._calendars.map(
      (selCal) => html`
        <ha-check-list-item
          @request-selected=${this._requestSelected}
          graphic="icon"
          style=${styleMap({
            "--mdc-theme-secondary": selCal.backgroundColor!,
          })}
          .value=${selCal.entity_id}
          .selected=${!this._deSelectedCalendars.includes(selCal.entity_id)}
        >
          <ha-state-icon
            slot="graphic"
            .hass=${this.hass}
            .stateObj=${selCal}
          ></ha-state-icon>
          ${selCal.name}
        </ha-check-list-item>
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
          ? html`<ha-button-menu
              slot="title"
              class="lists"
              multi
              fixed
              .noAnchor=${this.mobile}
              .y=${this.mobile
                ? this._headerHeight / 2
                : this._headerHeight / 4}
              .x=${this.mobile ? 0 : undefined}
            >
              <ha-button slot="trigger">
                ${this.hass.localize("ui.components.calendar.my_calendars")}
                <ha-svg-icon slot="end" .path=${mdiChevronDown}></ha-svg-icon>
              </ha-button>
              ${calendarItems}
              ${this.hass.user?.is_admin
                ? html` <li divider role="separator"></li>
                    <ha-list-item graphic="icon" @click=${this._addCalendar}>
                      <ha-svg-icon
                        .path=${mdiPlus}
                        slot="graphic"
                      ></ha-svg-icon>
                      ${this.hass.localize(
                        "ui.components.calendar.create_calendar"
                      )}
                    </ha-list-item>`
                : nothing}
            </ha-button-menu>`
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

  private async _requestSelected(ev: CustomEvent<RequestSelectedDetail>) {
    ev.stopPropagation();
    const entityId = (ev.target as HaListItem).value;
    if (ev.detail.selected) {
      this._deSelectedCalendars = this._deSelectedCalendars.filter(
        (cal) => cal !== entityId
      );
      if (ev.detail.source === "interaction") {
        // prevent adding the same calendar twice, an interaction event will be followed by a property event
        return;
      }
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

  private async _addCalendar(): Promise<void> {
    showConfigFlowDialog(this, {
      startFlowHandler: "local_calendar",
      showAdvanced: this.hass.userData?.showAdvanced,
      manifest: await fetchIntegrationManifest(this.hass, "local_calendar"),
      dialogClosedCallback: ({ flowFinished }) => {
        if (flowFinished) {
          this._calendars = getCalendars(this.hass);
        }
      },
    });
  }

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
        ha-button-menu ha-button {
          --ha-font-size-m: var(--ha-font-size-l);
        }
        :host([mobile]) .lists {
          --mdc-menu-min-width: 100vw;
        }
        :host([mobile]) ha-button-menu {
          --mdc-shape-medium: 0 0 var(--mdc-shape-medium)
            var(--mdc-shape-medium);
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
