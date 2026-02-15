import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { classMap } from "lit/directives/class-map";
import { customElement, property, state } from "lit/decorators";
import {
  computeCssColor,
  isValidColorString,
} from "../../../common/color/compute-color";
import { getColorByIndex } from "../../../common/color/colors";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import { debounce } from "../../../common/util/debounce";
import "../../../components/ha-card";
import "../../../components/ha-spinner";
import type { Calendar, CalendarEvent } from "../../../data/calendar";
import { fetchCalendarEvents } from "../../../data/calendar";
import type { EntityRegistryEntry } from "../../../data/entity/entity_registry";
import { subscribeEntityRegistry } from "../../../data/entity/entity_registry";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import type {
  CalendarViewChanged,
  FullCalendarView,
  HomeAssistant,
} from "../../../types";
import "../../calendar/ha-full-calendar";
import { findEntities } from "../common/find-entities";
import "../components/hui-warning";
import type {
  LovelaceCard,
  LovelaceCardEditor,
  LovelaceGridOptions,
} from "../types";
import type { CalendarCardConfig } from "./types";

@customElement("hui-calendar-card")
export class HuiCalendarCard
  extends SubscribeMixin(LitElement)
  implements LovelaceCard
{
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("../editor/config-elements/hui-calendar-card-editor");
    return document.createElement("hui-calendar-card-editor");
  }

  public static getStubConfig(
    hass: HomeAssistant,
    entities: string[],
    entitiesFill: string[]
  ) {
    const includeDomains = ["calendar"];
    const maxEntities = 2;
    const foundEntities = findEntities(
      hass,
      maxEntities,
      entities,
      entitiesFill,
      includeDomains
    );

    return {
      entities: foundEntities,
    };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public layout?: string;

  @state() private _events: CalendarEvent[] = [];

  @state() private _config?: CalendarCardConfig;

  @state() private _calendars: Calendar[] = [];

  @state() private _narrow = false;

  @state() private _error?: string = undefined;

  @state() private _entityRegistry?: EntityRegistryEntry[];

  @state() private _eventsLoaded = false;

  private _startDate?: Date;

  private _endDate?: Date;

  private _resizeObserver?: ResizeObserver;

  public setConfig(config: CalendarCardConfig): void {
    if (!config.entities?.length) {
      throw new Error("Entities must be specified");
    }

    if (!Array.isArray(config.entities)) {
      throw new Error("Entities need to be an array");
    }

    if (this._config?.entities !== config.entities) {
      this._fetchCalendarEvents();
    }

    this._config = { initial_view: "dayGridMonth", ...config };
  }

  public willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);

    // Don't build calendars until entity registry is loaded
    if (!this._entityRegistry) {
      return;
    }

    // Reset loading state when config changes or entity registry updates
    if (changedProps.has("_config") || changedProps.has("_entityRegistry")) {
      this._eventsLoaded = false;
    }

    if (
      !this.hasUpdated ||
      (changedProps.has("_config") && this._config?.entities) ||
      changedProps.has("_entityRegistry")
    ) {
      const computedStyles = getComputedStyle(this);
      const entityOptionsMap = new Map(
        this._entityRegistry?.map((entry) => [
          entry.entity_id,
          entry.options,
        ]) ?? []
      );
      if (this._config?.entities) {
        this._calendars = this._config.entities.map((entity, idx) => {
          const entityColor = entityOptionsMap.get(entity)?.calendar?.color;
          let backgroundColor: string;
          // Validate and use the color from entity registry if valid
          if (entityColor && isValidColorString(entityColor)) {
            backgroundColor = computeCssColor(entityColor);
          } else {
            // Fall back to default color by index
            backgroundColor = getColorByIndex(idx, computedStyles);
          }
          return {
            entity_id: entity,
            backgroundColor,
          };
        });
      }
    }
  }

  public getCardSize(): number {
    return 12;
  }

  public getGridOptions(): LovelaceGridOptions {
    return {
      rows: 6,
      columns: 12,
      min_columns: 4,
      min_rows: 4,
    };
  }

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeEntityRegistry(this.hass!.connection!, (entities) => {
        this._entityRegistry = entities;
      }),
    ];
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this.updateComplete.then(() => this._attachObserver());
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
  }

  protected render() {
    if (!this._config || !this.hass) {
      return nothing;
    }

    const loading = !this._entityRegistry || !this._eventsLoaded;

    const views: FullCalendarView[] = [
      "dayGridMonth",
      "dayGridDay",
      "listWeek",
    ];

    return html`
      <ha-card>
        ${this._config.title
          ? html`<div class="header">${this._config.title}</div>`
          : nothing}
        <ha-full-calendar
          class=${classMap({
            "is-grid": this.layout === "grid",
            "is-panel": this.layout === "panel",
            "has-title": !!this._config.title,
            loading: loading,
          })}
          .narrow=${this._narrow}
          .events=${this._events}
          .calendars=${this._calendars}
          .hass=${this.hass}
          .views=${views}
          .initialView=${this._config.initial_view!}
          .error=${this._error}
          @view-changed=${this._handleViewChanged}
        ></ha-full-calendar>
        ${loading
          ? html`<div class="loading">
              <ha-spinner></ha-spinner>
            </div>`
          : nothing}
      </ha-card>
    `;
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    if (!this._config || !this.hass) {
      return;
    }

    // Refetch events when entity registry changes (to update colors)
    if (changedProps.has("_entityRegistry") && this._entityRegistry) {
      this._fetchCalendarEvents();
    }

    // If no calendars configured, mark events as loaded to hide spinner
    if (
      this._entityRegistry &&
      !this._calendars.length &&
      !this._eventsLoaded
    ) {
      this._eventsLoaded = true;
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    const oldConfig = changedProps.get("_config") as
      | CalendarCardConfig
      | undefined;

    if (
      !oldHass ||
      !oldConfig ||
      (changedProps.has("hass") && oldHass.themes !== this.hass.themes) ||
      (changedProps.has("_config") && oldConfig.theme !== this._config.theme)
    ) {
      applyThemesOnElement(this, this.hass.themes, this._config!.theme);
    }
  }

  private _handleViewChanged(ev: HASSDomEvent<CalendarViewChanged>): void {
    this._startDate = ev.detail.start;
    this._endDate = ev.detail.end;
    this._eventsLoaded = false;
    this._fetchCalendarEvents();
  }

  private async _fetchCalendarEvents(): Promise<void> {
    if (!this._startDate || !this._endDate) {
      return;
    }

    this._error = undefined;
    const result = await fetchCalendarEvents(
      this.hass!,
      this._startDate,
      this._endDate,
      this._calendars
    );
    this._events = result.events;
    // Wait for component update and one animation frame for FullCalendar to render
    this.updateComplete.then(() => {
      requestAnimationFrame(() => {
        this._eventsLoaded = true;
      });
    });

    if (result.errors.length > 0) {
      this._error = `${this.hass!.localize(
        "ui.components.calendar.event_retrieval_error"
      )}`;
    }
  }

  private _measureCard() {
    const card = this.shadowRoot!.querySelector("ha-card");
    if (!card) {
      return;
    }
    this._narrow = card.offsetWidth < 870;
  }

  private async _attachObserver(): Promise<void> {
    if (!this._resizeObserver) {
      this._resizeObserver = new ResizeObserver(
        debounce(() => this._measureCard(), 250, false)
      );
    }
    const card = this.shadowRoot!.querySelector("ha-card");
    // If we show an error or warning there is no ha-card
    if (!card) {
      return;
    }
    this._resizeObserver.observe(card);
  }

  static styles = css`
    ha-card {
      position: relative;
      padding: 0 8px 8px;
      box-sizing: border-box;
      height: 100%;
      overflow: hidden;
    }

    .header {
      color: var(--ha-card-header-color, var(--primary-text-color));
      font-size: var(--ha-card-header-font-size, var(--ha-font-size-2xl));
      line-height: var(--ha-line-height-condensed);
      padding-top: 16px;
      padding-left: 8px;
      padding-inline-start: 8px;
      direction: var(--direction);
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    ha-full-calendar {
      --calendar-height: 400px;
      display: block;
      width: 100%;
      height: var(--calendar-height);
      min-height: var(--calendar-height);
    }

    ha-full-calendar.loading {
      visibility: hidden;
    }

    ha-full-calendar.is-grid,
    ha-full-calendar.is-panel {
      --calendar-height: calc(100% - 16px);
    }

    ha-full-calendar.is-grid.has-title,
    ha-full-calendar.is-panel.has-title {
      --calendar-height: calc(
        100% - var(--ha-card-header-font-size, var(--ha-font-size-2xl)) - 22px
      );
    }

    .loading {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--card-background-color, var(--ha-card-background));
      z-index: 1;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-calendar-card": HuiCalendarCard;
  }
}
