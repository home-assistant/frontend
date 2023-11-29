import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { getColorByIndex } from "../../../common/color/colors";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { HASSDomEvent } from "../../../common/dom/fire_event";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { debounce } from "../../../common/util/debounce";
import "../../../components/ha-card";
import {
  Calendar,
  CalendarEvent,
  fetchCalendarEvents,
} from "../../../data/calendar";
import type {
  CalendarViewChanged,
  FullCalendarView,
  HomeAssistant,
} from "../../../types";
import "../../calendar/ha-full-calendar";
import { findEntities } from "../common/find-entities";
import { loadPolyfillIfNeeded } from "../../../resources/resize-observer.polyfill";
import "../components/hui-warning";
import type { LovelaceCard, LovelaceCardEditor } from "../types";
import type { CalendarCardConfig } from "./types";

@customElement("hui-calendar-card")
export class HuiCalendarCard extends LitElement implements LovelaceCard {
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

  @property({ attribute: false }) public _events: CalendarEvent[] = [];

  @state() private _config?: CalendarCardConfig;

  @state() private _calendars: Calendar[] = [];

  @state() private _eventDisplay = "list-item";

  @state() private _narrow = false;

  @state() private _veryNarrow = false;

  @state() private _error?: string = undefined;

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

    this._calendars = config!.entities.map((entity, idx) => ({
      entity_id: entity,
      backgroundColor: getColorByIndex(idx),
    }));

    if (this._config?.entities !== config.entities) {
      this._fetchCalendarEvents();
    }

    this._config = { initial_view: "dayGridMonth", ...config };
  }

  public getCardSize(): number {
    return this._config?.header ? 1 : 0 + 11;
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
    if (!this._config || !this.hass || !this._calendars.length) {
      return nothing;
    }

    const views: FullCalendarView[] = this._veryNarrow
      ? ["listWeek"]
      : ["dayGridMonth", "dayGridDay", "listWeek"];

    return html`
      <ha-card>
        <div class="header">${this._config.title}</div>
        <ha-full-calendar
          .narrow=${this._narrow}
          .events=${this._events}
          .hass=${this.hass}
          .views=${views}
          .initialView=${this._config.initial_view!}
          .eventDisplay=${this._eventDisplay}
          .error=${this._error}
          @view-changed=${this._handleViewChanged}
        ></ha-full-calendar>
      </ha-card>
    `;
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (!this._config || !this.hass) {
      return;
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
    this._eventDisplay =
      ev.detail.view === "dayGridMonth" ? "list-item" : "auto";
    this._startDate = ev.detail.start;
    this._endDate = ev.detail.end;
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

    if (result.errors.length > 0) {
      const nameList = result.errors
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

  private _measureCard() {
    const card = this.shadowRoot!.querySelector("ha-card");
    if (!card) {
      return;
    }
    this._narrow = card.offsetWidth < 870;
    this._veryNarrow = card.offsetWidth < 350;
  }

  private async _attachObserver(): Promise<void> {
    if (!this._resizeObserver) {
      await loadPolyfillIfNeeded();
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

  static get styles(): CSSResultGroup {
    return css`
      ha-card {
        position: relative;
        padding: 0 8px 8px;
        box-sizing: border-box;
        height: 100%;
      }

      .header {
        color: var(--ha-card-header-color, --primary-text-color);
        font-size: var(--ha-card-header-font-size, 24px);
        line-height: 1.2;
        padding-top: 16px;
        padding-left: 8px;
        padding-inline-start: 8px;
        direction: var(--direction);
      }

      ha-full-calendar {
        --calendar-height: 400px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-calendar-card": HuiCalendarCard;
  }
}
