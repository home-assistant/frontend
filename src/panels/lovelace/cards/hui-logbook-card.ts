import { mdiChevronRight } from "@mdi/js";
import { startOfYesterday } from "date-fns";
import type { HassServiceTarget } from "home-assistant-js-websocket";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import { ensureArray } from "../../../common/array/ensure-array";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { navigate } from "../../../common/navigate";
import { createSearchParam } from "../../../common/url/search-params";
import "../../../components/ha-card";
import "../../../components/ha-icon-button";
import { resolveEntityIDs } from "../../../data/selector";
import type { HomeAssistant } from "../../../types";
import "../../logbook/ha-logbook";
import type { HaLogbook } from "../../logbook/ha-logbook";
import { findEntities } from "../common/find-entities";
import { processConfigEntities } from "../common/process-config-entities";
import "../components/hui-warning";
import type { EntityConfig } from "../entity-rows/types";
import type {
  LovelaceCard,
  LovelaceCardEditor,
  LovelaceGridOptions,
} from "../types";
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
      target: {
        entity_id: foundEntities,
      },
    };
  }

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public layout?: string;

  @state() private _config?: LogbookCardConfig;

  @state() private _time?: HaLogbook["time"];

  @state() private _targetPickerValue: HassServiceTarget = {};

  @state() private _stateFilter?: string[];

  public getCardSize(): number {
    return 9 + (this._config?.title ? 1 : 0);
  }

  public getGridOptions(): LovelaceGridOptions {
    return {
      rows: 6,
      columns: 12,
      min_columns: 6,
      min_rows: this._config?.title ? 4 : 3,
    };
  }

  public validateTarget(
    config: LogbookCardConfig
  ): HassServiceTarget | undefined {
    if (
      (config.entities && !config.entities.length) ||
      (config.target &&
        !config.target.area_id?.length &&
        !config.target.device_id?.length &&
        !config.target.entity_id?.length &&
        !config.target.floor_id?.length &&
        !config.target.label_id?.length)
    ) {
      return undefined;
    }

    if (config.entities) {
      return {
        entity_id: processConfigEntities<EntityConfig>(config.entities).map(
          (entity) => entity.entity
        ),
      };
    }

    if (config.target?.entity_id) {
      return {
        ...config.target,
        entity_id: processConfigEntities<EntityConfig>(
          ensureArray(config.target!.entity_id)
        ).map((entity) => entity.entity),
      };
    }

    return config.target;
  }

  public setConfig(config: LogbookCardConfig): void {
    const target = this.validateTarget(config);
    if (!target) {
      throw new Error(
        "The provided target in the logbook card has no entities. Targets can include entities, devices, labels, or areas, with devices, areas, and labels resolving to entities."
      );
    }

    this._config = {
      hours_to_show: DEFAULT_HOURS_TO_SHOW,
      ...config,
    };
    this._time = {
      recent: this._config!.hours_to_show! * 60 * 60,
    };

    this._targetPickerValue = target;

    this._stateFilter = ensureArray(config.state_filter);
  }

  private _showMore() {
    navigate(this._showMoreUrl());
  }

  private _showMoreUrl(): string {
    const target = this._targetPickerValue;
    const params: Record<string, string> = {
      start_date: startOfYesterday().toISOString(),
      back: "1",
    };
    if (target.entity_id) {
      params.entity_id = ensureArray(target.entity_id).join(",");
    }
    if (target.device_id) {
      params.device_id = ensureArray(target.device_id).join(",");
    }
    if (target.area_id) {
      params.area_id = ensureArray(target.area_id).join(",");
    }
    if (target.floor_id) {
      params.floor_id = ensureArray(target.floor_id).join(",");
    }
    if (target.label_id) {
      params.label_id = ensureArray(target.label_id).join(",");
    }
    return `/logbook?${createSearchParam(params)}`;
  }

  private _getEntityIds(): string[] | undefined {
    const entities = this._getMemoizedEntityIds(
      this._targetPickerValue,
      this.hass.entities,
      this.hass.devices,
      this.hass.areas
    );
    if (entities.length === 0) {
      return undefined;
    }
    return entities;
  }

  private _getMemoizedEntityIds = memoizeOne(
    (
      targetPickerValue: HassServiceTarget,
      entities: HomeAssistant["entities"],
      devices: HomeAssistant["devices"],
      areas: HomeAssistant["areas"]
    ): string[] =>
      resolveEntityIDs(this.hass, targetPickerValue, entities, devices, areas)
  );

  protected update(changedProperties: PropertyValues<this>) {
    super.update(changedProperties);
    if (changedProperties.has("layout")) {
      this.toggleAttribute("ispanel", this.layout === "panel");
    }
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

    if (!isComponentLoaded(this.hass.config, "logbook")) {
      return html`
        <hui-warning .hass=${this.hass}>
          ${this.hass.localize("ui.components.logbook.not_loaded", {
            platform: "logbook",
          })}</hui-warning
        >
      `;
    }

    return html`
      <ha-card class=${classMap({ "no-header": !this._config!.title })}>
        ${this._config!.title
          ? html`<div class="card-header">
              <h1 class="name">${this._config!.title}</h1>
              <ha-icon-button
                .path=${mdiChevronRight}
                .label=${this.hass.localize(
                  "ui.dialogs.more_info_control.show_more"
                )}
                @click=${this._showMore}
              ></ha-icon-button>
            </div>`
          : nothing}
        <div class="content">
          <ha-logbook
            class=${classMap({
              "is-grid": this.layout === "grid",
              "is-panel": this.layout === "panel",
            })}
            .hass=${this.hass}
            .time=${this._time}
            .entityIds=${this._getEntityIds()}
            .stateFilter=${this._stateFilter}
            narrow
            no-icon
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

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 16px 0;
        }

        .card-header .name {
          margin: 0;
          font-size: var(--ha-card-header-font-size, 1.4rem);
          font-weight: var(--ha-card-header-font-weight, 500);
          color: var(--ha-card-header-color, var(--primary-text-color));
        }

        .card-header a {
          color: var(--primary-text-color);
          margin-right: calc(var(--ha-space-2) * -1);
          margin-inline-end: calc(var(--ha-space-2) * -1);
          margin-inline-start: initial;
        }

        .content {
          height: 100%;
          padding: 0 16px 16px;
        }

        .no-header .content {
          padding-top: 16px;
        }

        ha-logbook {
          height: 385px;
          display: block;
        }

        ha-logbook.is-grid,
        ha-logbook.is-panel {
          height: 100%;
        }

        :host([ispanel]) .content,
        :host([ispanel]) ha-logbook {
          height: 100%;
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
