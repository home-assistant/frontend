import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";

import "../../../components/ha-card";
import "../../../components/ha-icon";
import "../../calendar/ha-full-calendar";

import type {
  HomeAssistant,
  CalendarEvent,
  Calendar,
  CalendarViewChanged,
} from "../../../types";
import type { LovelaceCard, LovelaceCardEditor } from "../types";
import type { CalendarCardConfig } from "./types";
import { findEntities } from "../common/find-entites";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import "../components/hui-warning";
import { processConfigEntities } from "../common/process-config-entities";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { fetchCalendarEvents } from "../../../data/calendar";
import { HASSDomEvent } from "../../../common/dom/fire_event";
import { HA_COLOR_PALETTE } from "../../../common/const";

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
    const maxEntities = 1;
    const foundEntities = findEntities(
      hass,
      maxEntities,
      entities,
      entitiesFill,
      includeDomains
    );

    return {
      entity: foundEntities[0] || "",
    };
  }

  @property() public hass?: HomeAssistant;

  @property() private _config?: CalendarCardConfig;

  @property() public _events: CalendarEvent[] = [];

  @property() private _calendars: Calendar[] = [];

  public setConfig(config: CalendarCardConfig): void {
    if (!config.entities) {
      throw new Error("Entities must be defined");
    }

    if (config.entities && !Array.isArray(config.entities)) {
      throw new Error("Entities need to be an array");
    }

    this._config = config;
  }

  public getCardSize(): number {
    return 4;
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass || !this._calendars.length) {
      return html``;
    }

    return html`
      <ha-card>
        <div class="header">${this._config.title}</div>
        <ha-full-calendar
          .events=${this._events}
          .narrow=${this.offsetWidth < 870}
          .hass=${this.hass}
          .views=${["listWeek", "dayGridMonth"]}
          @view-changed=${this._handleViewChanged}
        ></ha-full-calendar>
      </ha-card>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues): void {
    super.firstUpdated(changedProps);
    const configEntities = this._config!.entities
      ? processConfigEntities(this._config!.entities)
      : [];

    const calendars: Calendar[] = [];

    configEntities.forEach((entity, idx) => {
      calendars.push({
        entity_id: entity.entity,
        name: computeStateName(this.hass!.states[entity.entity]),
        backgroundColor: HA_COLOR_PALETTE[idx % HA_COLOR_PALETTE.length],
      });
    });

    this._calendars = calendars;
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
      oldHass.themes !== this.hass.themes ||
      oldConfig.theme !== this._config.theme
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

  static get styles(): CSSResult {
    return css`
      ha-card {
        position: relative;
      }

      .header {
        color: var(--ha-card-header-color, --primary-text-color);
        font-family: var(--ha-card-header-font-family, inherit);
        font-size: var(--ha-card-header-font-size, 24px);
        letter-spacing: -0.012em;
        line-height: 32px;
        padding: 16px 8px 0;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-calendar-card": HuiCalendarCard;
  }
}
