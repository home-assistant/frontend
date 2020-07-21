import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
  internalProperty,
} from "lit-element";

import "../../../components/ha-card";
import "../../../components/ha-icon";
import "../../calendar/ha-full-calendar";

import type {
  HomeAssistant,
  CalendarEvent,
  Calendar,
  CalendarViewChanged,
  FullCalendarView,
} from "../../../types";
import type { LovelaceCard, LovelaceCardEditor } from "../types";
import type { CalendarCardConfig } from "./types";
import { findEntities } from "../common/find-entites";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import "../components/hui-warning";
import { fetchCalendarEvents } from "../../../data/calendar";
import { HASSDomEvent } from "../../../common/dom/fire_event";
import { HA_COLOR_PALETTE } from "../../../common/const";
import { debounce } from "../../../common/util/debounce";
import { installResizeObserver } from "../common/install-resize-observer";

@customElement("hui-calendar-card")
export class HuiCalendarCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import(
      /* webpackChunkName: "hui-calendar-card-editor" */ "../editor/config-elements/hui-calendar-card-editor"
    );
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

  @internalProperty() private _config?: CalendarCardConfig;

  @internalProperty() private _calendars: Calendar[] = [];

  @internalProperty() private _narrow = false;

  @internalProperty() private _veryNarrow = false;

  private _resizeObserver?: ResizeObserver;

  public setConfig(config: CalendarCardConfig): void {
    if (!config.entities) {
      throw new Error("Entities must be defined");
    }

    if (config.entities && !Array.isArray(config.entities)) {
      throw new Error("Entities need to be an array");
    }

    this._calendars = config!.entities.map((entity, idx) => {
      return {
        entity_id: entity,
        backgroundColor: `#${HA_COLOR_PALETTE[idx % HA_COLOR_PALETTE.length]}`,
      };
    });

    this._config = config;
  }

  public getCardSize(): number {
    return 4;
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
      : ["listWeek", "dayGridMonth", "dayGridDay"];

    return html`
      <ha-card>
        <div class="header">${this._config.title}</div>
        <ha-full-calendar
          .narrow=${this._narrow}
          .events=${this._events}
          .hass=${this.hass}
          .views=${views}
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

  private async _handleViewChanged(
    ev: HASSDomEvent<CalendarViewChanged>
  ): Promise<void> {
    this._events = await fetchCalendarEvents(
      this.hass!,
      ev.detail.start,
      ev.detail.end,
      this._calendars
    );
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

  static get styles(): CSSResult {
    return css`
      ha-card {
        position: relative;
        padding: 0 8px 8px;
      }

      .header {
        color: var(--ha-card-header-color, --primary-text-color);
        font-size: var(--ha-card-header-font-size, 24px);
        line-height: 1.2;
        padding-top: 16px;
        padding-left: 8px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-calendar-card": HuiCalendarCard;
  }
}
