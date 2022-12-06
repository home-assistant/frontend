import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state, query } from "lit/decorators";
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
import type { HAFullCalendar } from "../../calendar/ha-full-calendar";
import { findEntities } from "../common/find-entities";
import { installResizeObserver } from "../common/install-resize-observer";
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

  @state() private _narrow = false;

  @state() private _veryNarrow = false;

  @state() private _error?: string = undefined;

  @query("ha-full-calendar", true) private _calendar?: HAFullCalendar;

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
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass || !this._calendars.length) {
      return html``;
    }

    const views: FullCalendarView[] = this._veryNarrow
      ? ["listWeek"]
      : ["dayGridMonth", "dayGridDay", "listWeek"];

    return html`
      <ha-card>
        ${this._error
          ? html`<ha-alert
              alert-type="error"
              dismissable
              @alert-dismissed-clicked=${this._clearError}
              >${this._error}</ha-alert
            >`
          : ""}
        <div class="header">${this._config.title}</div>
        <ha-full-calendar
          .narrow=${this._narrow}
          .events=${this._events}
          .hass=${this.hass}
          .views=${views}
          .initialView=${this._config.initial_view!}
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
    this._startDate = ev.detail.start;
    this._endDate = ev.detail.end;
    this._fetchCalendarEvents();
  }

  private async _fetchCalendarEvents(): Promise<void> {
    if (!this._startDate || !this._endDate) {
      return;
    }

    const result = await fetchCalendarEvents(
      this.hass!,
      this._startDate,
      this._endDate,
      this._calendars
    );
    this._events = result.events;

    if (this._calendars && result.errors.length > 0) {
      let nameList = "";
      result.errors.forEach((error_entity_id) => {
        const name = computeStateName(this.hass!.states[error_entity_id]);
        if (nameList.length > 0) {
          nameList = nameList.concat(", ");
        }

        nameList = nameList.concat(name || error_entity_id);
      });

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

    this._calendar?.updateSize();
  }

  private async _attachObserver(): Promise<void> {
    if (!this._resizeObserver) {
      await installResizeObserver();
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

  private _clearError() {
    this._error = undefined;
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

      ha-alert {
        display: block;
        margin: 4px 0;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-calendar-card": HuiCalendarCard;
  }
}
