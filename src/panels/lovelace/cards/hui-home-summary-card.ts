import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { styleMap } from "lit/directives/style-map";
import { computeCssColor } from "../../../common/color/compute-color";
import { computeDomain } from "../../../common/entity/compute_domain";
import {
  findEntities,
  generateEntityFilter,
} from "../../../common/entity/entity_filter";
import { formatNumber } from "../../../common/number/format_number";
import "../../../components/ha-card";
import "../../../components/ha-icon";
import "../../../components/ha-ripple";
import "../../../components/tile/ha-tile-icon";
import "../../../components/tile/ha-tile-info";
import type { ActionHandlerEvent } from "../../../data/lovelace/action_handler";
import "../../../state-display/state-display";
import type { HomeAssistant } from "../../../types";
import { actionHandler } from "../common/directives/action-handler-directive";
import { handleAction } from "../common/handle-action";
import { hasAction } from "../common/has-action";
import {
  getSummaryLabel,
  HOME_SUMMARIES_FILTERS,
  HOME_SUMMARIES_ICONS,
  type HomeSummary,
} from "../strategies/home/helpers/home-summaries";
import type { LovelaceCard, LovelaceGridOptions } from "../types";
import type { HomeSummaryCard } from "./types";

const COLORS: Record<HomeSummary, string> = {
  lights: "amber",
  climate: "deep-orange",
  security: "blue-grey",
  media_players: "blue",
};

@customElement("hui-home-summary-card")
export class HuiHomeSummaryCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: HomeSummaryCard;

  public setConfig(config: HomeSummaryCard): void {
    this._config = config;
  }

  public getCardSize(): number {
    return this._config?.vertical ? 2 : 1;
  }

  public getGridOptions(): LovelaceGridOptions {
    const columns = 6;
    let min_columns = 6;
    let rows = 1;

    if (this._config?.vertical) {
      rows++;
      min_columns = 3;
    }
    return {
      columns,
      rows,
      min_columns,
      min_rows: rows,
    };
  }

  private _handleAction(ev: ActionHandlerEvent) {
    handleAction(this, this.hass!, this._config!, ev.detail.action!);
  }

  private get _hasCardAction() {
    return (
      hasAction(this._config?.tap_action) ||
      hasAction(this._config?.hold_action) ||
      hasAction(this._config?.double_tap_action)
    );
  }

  private _computeSummaryState(): string {
    if (!this._config || !this.hass) {
      return "";
    }
    const allEntities = Object.keys(this.hass!.states);

    const areas = Object.values(this.hass.areas);
    const areasFilter = generateEntityFilter(this.hass, {
      area: areas.map((area) => area.area_id),
    });

    const entitiesInsideArea = allEntities.filter(areasFilter);

    switch (this._config.summary) {
      case "lights": {
        // Number of lights on
        const lightsFilters = HOME_SUMMARIES_FILTERS.lights.map((filter) =>
          generateEntityFilter(this.hass!, filter)
        );

        const lightEntities = findEntities(entitiesInsideArea, lightsFilters);

        const onLights = lightEntities.filter((entityId) => {
          const s = this.hass!.states[entityId]?.state;
          return s === "on";
        });

        return onLights.length
          ? this.hass.localize("ui.card.home-summary.count_lights_on", {
              count: onLights.length,
            })
          : this.hass.localize("ui.card.home-summary.all_lights_off");
      }
      case "climate": {
        // Min/Max temperature of the areas
        const areaSensors = areas
          .map((area) => area.temperature_entity_id)
          .filter(Boolean);

        const sensorsValues = areaSensors
          .map(
            (entityId) => parseFloat(this.hass!.states[entityId!]?.state) || NaN
          )
          .filter((value) => !isNaN(value));

        if (sensorsValues.length === 0) {
          return "";
        }
        const minTemp = Math.min(...sensorsValues);
        const maxTemp = Math.max(...sensorsValues);

        if (isNaN(minTemp) || isNaN(maxTemp)) {
          return "";
        }

        const formattedMinTemp = formatNumber(minTemp, this.hass?.locale, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        });
        const formattedMaxTemp = formatNumber(maxTemp, this.hass?.locale, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        });
        return formattedMinTemp === formattedMaxTemp
          ? `${formattedMinTemp}°`
          : `${formattedMinTemp} - ${formattedMaxTemp}°`;
      }
      case "security": {
        // Alarm and lock status
        const securityFilters = HOME_SUMMARIES_FILTERS.security.map((filter) =>
          generateEntityFilter(this.hass!, filter)
        );

        const securityEntities = findEntities(
          entitiesInsideArea,
          securityFilters
        );

        const locks = securityEntities.filter((entityId) => {
          const domain = computeDomain(entityId);
          return domain === "lock";
        });

        const alarms = securityEntities.filter((entityId) => {
          const domain = computeDomain(entityId);
          return domain === "alarm_control_panel";
        });

        const disarmedAlarms = alarms.filter((entityId) => {
          const s = this.hass!.states[entityId]?.state;
          return s === "disarmed";
        });

        if (!locks.length && !alarms.length) {
          return "";
        }

        const unlockedLocks = locks.filter((entityId) => {
          const s = this.hass!.states[entityId]?.state;
          return s === "unlocked" || s === "jammed" || s === "open";
        });

        if (unlockedLocks.length) {
          return this.hass.localize(
            "ui.card.home-summary.count_locks_unlocked",
            {
              count: unlockedLocks.length,
            }
          );
        }
        if (disarmedAlarms.length) {
          return this.hass.localize(
            "ui.card.home-summary.count_alarms_disarmed",
            {
              count: disarmedAlarms.length,
            }
          );
        }
        return this.hass.localize("ui.card.home-summary.all_secure");
      }
      case "media_players": {
        // Playing media
        const mediaPlayerFilters = HOME_SUMMARIES_FILTERS.media_players.map(
          (filter) => generateEntityFilter(this.hass!, filter)
        );

        const mediaPlayerEntities = findEntities(
          entitiesInsideArea,
          mediaPlayerFilters
        );

        const playingMedia = mediaPlayerEntities.filter((entityId) => {
          const s = this.hass!.states[entityId]?.state;
          return s === "playing";
        });

        return playingMedia.length
          ? this.hass.localize("ui.card.home-summary.count_media_playing", {
              count: playingMedia.length,
            })
          : this.hass.localize("ui.card.home-summary.no_media_playing");
      }
    }
    return "";
  }

  protected render() {
    if (!this._config || !this.hass) {
      return nothing;
    }

    const contentClasses = { vertical: Boolean(this._config.vertical) };

    const color = computeCssColor(COLORS[this._config.summary]);

    const style = {
      "--tile-color": color,
    };

    const secondary = this._computeSummaryState();

    const label = getSummaryLabel(this.hass.localize, this._config.summary);
    const icon = HOME_SUMMARIES_ICONS[this._config.summary];

    return html`
      <ha-card style=${styleMap(style)}>
        <div
          class="background"
          @action=${this._handleAction}
          .actionHandler=${actionHandler({
            hasHold: hasAction(this._config!.hold_action),
            hasDoubleClick: hasAction(this._config!.double_tap_action),
          })}
          role=${ifDefined(this._hasCardAction ? "button" : undefined)}
          tabindex=${ifDefined(this._hasCardAction ? "0" : undefined)}
          aria-labelledby="info"
        >
          <ha-ripple .disabled=${!this._hasCardAction}></ha-ripple>
        </div>
        <div class="container">
          <div class="content ${classMap(contentClasses)}">
            <ha-tile-icon>
              <ha-icon slot="icon" .icon=${icon}></ha-icon>
            </ha-tile-icon>
            <ha-tile-info
              id="info"
              .primary=${label}
              .secondary=${secondary}
            ></ha-tile-info>
          </div>
        </div>
      </ha-card>
    `;
  }

  static styles = css`
    :host {
      --tile-color: var(--state-inactive-color);
      -webkit-tap-highlight-color: transparent;
    }
    ha-card:has(.background:focus-visible) {
      --shadow-default: var(--ha-card-box-shadow, 0 0 0 0 transparent);
      --shadow-focus: 0 0 0 1px var(--tile-color);
      border-color: var(--tile-color);
      box-shadow: var(--shadow-default), var(--shadow-focus);
    }
    ha-card {
      --ha-ripple-color: var(--tile-color);
      --ha-ripple-hover-opacity: 0.04;
      --ha-ripple-pressed-opacity: 0.12;
      height: 100%;
      transition:
        box-shadow 180ms ease-in-out,
        border-color 180ms ease-in-out;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    ha-card.active {
      --tile-color: var(--state-icon-color);
    }
    [role="button"] {
      cursor: pointer;
      pointer-events: auto;
    }
    [role="button"]:focus {
      outline: none;
    }
    .background {
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      right: 0;
      border-radius: var(--ha-card-border-radius, 12px);
      margin: calc(-1 * var(--ha-card-border-width, 1px));
      overflow: hidden;
    }
    .container {
      margin: calc(-1 * var(--ha-card-border-width, 1px));
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .container.horizontal {
      flex-direction: row;
    }

    .content {
      position: relative;
      display: flex;
      flex-direction: row;
      align-items: center;
      padding: 10px;
      flex: 1;
      min-width: 0;
      box-sizing: border-box;
      pointer-events: none;
      gap: 10px;
    }

    .vertical {
      flex-direction: column;
      text-align: center;
      justify-content: center;
    }
    .vertical ha-tile-info {
      width: 100%;
      flex: none;
    }

    ha-tile-icon {
      --tile-icon-color: var(--tile-color);
      position: relative;
      padding: 6px;
      margin: -6px;
    }

    ha-tile-info {
      position: relative;
      min-width: 0;
      transition: background-color 180ms ease-in-out;
      box-sizing: border-box;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-home-summary-card": HuiHomeSummaryCard;
  }
}
