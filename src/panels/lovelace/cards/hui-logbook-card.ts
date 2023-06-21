import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import "../../../components/ha-card";
import type { HomeAssistant } from "../../../types";
import "../../logbook/ha-logbook";
import type { HaLogbook } from "../../logbook/ha-logbook";
import { findEntities } from "../common/find-entities";
import { processConfigEntities } from "../common/process-config-entities";
import "../components/hui-warning";
import type { EntityConfig } from "../entity-rows/types";
import type { LovelaceCard, LovelaceCardEditor } from "../types";
import type { LogbookCardConfig } from "./types";

export const DEFAULT_HOURS_TO_SHOW = 24;

@customElement("hui-logbook-card")
export class HuiLogbookCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("../editor/config-elements/hui-logbook-card-editor");
    return document.createElement("hui-logbook-card-editor");
  }

  public static getStubConfig(
    hass: HomeAssistant,
    entities: string[],
    entitiesFill: string[]
  ) {
    const includeDomains = ["light", "switch"];
    const maxEntities = 3;
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

  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: LogbookCardConfig;

  @state() private _time?: HaLogbook["time"];

  @state() private _entityId?: string[];

  public getCardSize(): number {
    return 9 + (this._config?.title ? 1 : 0);
  }

  public setConfig(config: LogbookCardConfig): void {
    if (!config.entities.length) {
      throw new Error("Entities must be specified");
    }

    this._config = {
      hours_to_show: DEFAULT_HOURS_TO_SHOW,
      ...config,
    };
    this._time = {
      recent: this._config!.hours_to_show! * 60 * 60,
    };
    this._entityId = processConfigEntities<EntityConfig>(config.entities).map(
      (entity) => entity.entity
    );
  }

  protected updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);
    if (!this._config || !this.hass) {
      return;
    }

    const configChanged = changedProperties.has("_config");
    const hassChanged = changedProperties.has("hass");
    const oldHass = changedProperties.get("hass") as HomeAssistant | undefined;
    const oldConfig = changedProperties.get("_config") as LogbookCardConfig;

    if (
      (hassChanged && oldHass?.themes !== this.hass.themes) ||
      (configChanged && oldConfig?.theme !== this._config.theme)
    ) {
      applyThemesOnElement(this, this.hass.themes, this._config.theme);
    }
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    if (!isComponentLoaded(this.hass, "logbook")) {
      return html`
        <hui-warning>
          ${this.hass.localize(
            "ui.components.logbook.not_loaded",
            "platform",
            "logbook"
          )}</hui-warning
        >
      `;
    }

    return html`
      <ha-card
        .header=${this._config!.title}
        class=${classMap({ "no-header": !this._config!.title })}
      >
        <div class="content">
          <ha-logbook
            .hass=${this.hass}
            .time=${this._time}
            .entityIds=${this._entityId}
            narrow
            relative-time
            virtualize
          ></ha-logbook>
        </div>
      </ha-card>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        ha-card {
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .content {
          padding: 0 16px 16px;
        }

        .no-header .content {
          padding-top: 16px;
        }

        ha-logbook {
          height: 385px;
          display: block;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-logbook-card": HuiLogbookCard;
  }
}
