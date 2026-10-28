import "@home-assistant/webawesome/dist/components/divider/divider";
import { ResizeController } from "@lit-labs/observers/resize-controller";
import { mdiChevronDown, mdiPlus, mdiRefresh } from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { CSSResultGroup, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { storage } from "../../common/decorators/storage";
import type { HASSDomEvent } from "../../common/dom/fire_event";
import "../../components/ha-button";
import "../../components/ha-card";
import "../../components/ha-dropdown";
import "../../components/ha-dropdown-item";
import type { HaDropdownItem } from "../../components/ha-dropdown-item";
import "../../components/ha-icon-button";
import "../../components/ha-list";
import "../../components/ha-list-item";
import "../../components/ha-spinner";
import "../../components/ha-state-icon";
import "../../components/ha-svg-icon";
import "../../components/ha-two-pane-top-app-bar-fixed";
import type { Calendar } from "../../data/calendar";
import { getCalendars } from "../../data/calendar";
import { CalendarEventsController } from "../../data/calendar-events-controller";
import type { EntityRegistryEntry } from "../../data/entity/entity_registry";
import { subscribeEntityRegistry } from "../../data/entity/entity_registry";
import { fetchIntegrationManifest } from "../../data/integration";
import { showConfigFlowDialog } from "../../dialogs/config-flow/show-dialog-config-flow";
import { panelIsReady } from "../../layouts/panel-ready";
import { SubscribeMixin } from "../../mixins/subscribe-mixin";
import { haStyle } from "../../resources/styles";
import type { CalendarViewChanged, HomeAssistant } from "../../types";
import "./ha-full-calendar";

@customElement("ha-panel-calendar")
class PanelCalendar extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ type: Boolean, reflect: true }) public mobile = false;

  @state() private _calendars: Calendar[] = [];

  @state() private _entityRegistry?: EntityRegistryEntry[];

  @state()
  @storage({
    key: "deSelectedCalendars",
    state: true,
  })
  private _deSelectedCalendars: string[] = [];

  private _start?: Date;

  private _end?: Date;

  private _events = new CalendarEventsController(this);

  private _showPaneController = new ResizeController(this, {
    callback: (entries) => entries[0]?.contentRect.width > 750,
  });

  private _mql?: MediaQueryList;

  private _initialReady = false;

  public connectedCallback() {
    super.connectedCallback();
    this._mql = window.matchMedia(
      "(max-width: 450px), all and (max-height: 500px)"
    );
    this._mql.addEventListener("change", this._setIsMobile);
    this.mobile = this._mql.matches;
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._mql?.removeEventListener("change", this._setIsMobile!);
    this._mql = undefined;
  }

  private _setIsMobile = (ev: MediaQueryListEvent) => {
    this.mobile = ev.matches;
  };

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeEntityRegistry(this.hass.connection!, (entities) => {
        this._entityRegistry = entities;
        // Refresh calendars when entity registry updates (includes color changes)
        this._calendars = getCalendars(this.hass, this, this._entityRegistry);
        if (!this._initialReady) {
          this._initialReady = true;
          panelIsReady(this);
        }
        // Resubscribe events if view dates are available (handles both initial load and color updates)
        if (this._start && this._end) {
          this._events.unsubscribeAll().then(() => {
            this._subscribeCalendarEvents(this._selectedCalendars);
          });
        }
      }),
    ];
  }

  protected render(): TemplateResult {
    if (!this._entityRegistry) {
      return html`
        <ha-two-pane-top-app-bar-fixed .narrow=${this.narrow}>
          <div slot="title">
            ${this.hass.localize("ui.components.calendar.my_calendars")}
          </div>
          <div class="loading">
            <ha-spinner></ha-spinner>
          </div>
        </ha-two-pane-top-app-bar-fixed>
      `;
    }

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
        ${
          !showPane
            ? html`<ha-dropdown slot="title">
                <ha-button slot="trigger">
                  ${this.hass.localize("ui.components.calendar.my_calendars")}
                  <ha-svg-icon slot="end" .path=${mdiChevronDown}></ha-svg-icon>
                </ha-button>
                ${calendarItems}
                ${
                  this.hass.user?.is_admin
                    ? html`<wa-divider></wa-divider>
                        <ha-dropdown-item @click=${this._addCalendar}>
                          <ha-svg-icon
                            .path=${mdiPlus}
                            slot="icon"
                          ></ha-svg-icon>
                          ${this.hass.localize(
                            "ui.components.calendar.create_calendar"
                          )}
                        </ha-dropdown-item>`
                    : nothing
                }
              </ha-dropdown>`
            : html`<div slot="title">
                ${this.hass.localize("ui.components.calendar.my_calendars")}
              </div>`
        }
        <ha-icon-button
          slot="actionItems"
          .path=${mdiRefresh}
          .label=${this.hass.localize("ui.common.refresh")}
          @click=${this._handleRefresh}
        ></ha-icon-button>
        ${
          showPane
            ? html`<ha-list slot="pane" multi>${calendarItems}</ha-list>${
                  this.hass.user?.is_admin
                    ? html`<ha-list-item
                        graphic="icon"
                        slot="pane-footer"
                        @click=${this._addCalendar}
                      >
                        <ha-svg-icon
                          .path=${mdiPlus}
                          slot="graphic"
                        ></ha-svg-icon>
                        ${this.hass.localize(
                          "ui.components.calendar.create_calendar"
                        )}
                      </ha-list-item>`
                    : nothing
                }`
            : nothing
        }
        <ha-full-calendar
          add-fab
          .events=${this._events.events}
          .calendars=${this._calendars}
          .narrow=${this.narrow}
          .initialView=${this.narrow ? "listWeek" : "dayGridMonth"}
          .hass=${this.hass}
          .error=${this._computeError(this._events.errorCalendars)}
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

  private _subscribeCalendarEvents(calendars: Calendar[]): void {
    if (!this._start || !this._end || calendars.length === 0) {
      return;
    }

    this._events.subscribe(this.hass, calendars, this._start, this._end);
  }

  private _requestSelected(ev: Event) {
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
      this._subscribeCalendarEvents([calendar]);
    } else {
      this._deSelectedCalendars = [...this._deSelectedCalendars, entityId];
      this._events.unsubscribe(entityId);
    }
  }

  private _addCalendar = async (): Promise<void> => {
    showConfigFlowDialog(this, {
      startFlowHandler: "local_calendar",
      manifest: await fetchIntegrationManifest(this.hass, "local_calendar"),
      dialogClosedCallback: ({ flowFinished }) => {
        if (flowFinished) {
          this._calendars = getCalendars(this.hass, this, this._entityRegistry);
        }
      },
    });
  };

  private async _handleViewChanged(
    ev: HASSDomEvent<CalendarViewChanged>
  ): Promise<void> {
    this._start = ev.detail.start;
    this._end = ev.detail.end;
    await this._events.unsubscribeAll();
    this._subscribeCalendarEvents(this._selectedCalendars);
  }

  private async _handleRefresh(): Promise<void> {
    await this._events.unsubscribeAll();
    this._subscribeCalendarEvents(this._selectedCalendars);
  }

  private _computeError(error_entity_ids: string[]): string | undefined {
    if (error_entity_ids.length === 0) {
      return undefined;
    }
    const nameList = error_entity_ids
      .map((error_entity_id) =>
        this.hass.states[error_entity_id]
          ? this.hass.formatEntityName(this.hass.states[error_entity_id])
          : error_entity_id
      )
      .join(", ");

    return `${this.hass.localize(
      "ui.components.calendar.event_retrieval_error"
    )} ${nameList}`;
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
          padding-inline-start: 32px;
          padding-inline-end: initial;
          --icon-primary-color: var(--ha-color-fill-neutral-loud-resting);
        }

        ha-dropdown-item[aria-checked="true"] {
          --icon-primary-color: var(--primary-color);
        }

        :host([mobile]) {
          padding-left: unset;
          padding-inline-start: unset;
          padding-inline-end: initial;
        }
        .loading {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--ha-space-8);
          min-height: 400px;
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
