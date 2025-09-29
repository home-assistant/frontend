import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeCssColor } from "../../../common/color/compute-color";
import { computeDomain } from "../../../common/entity/compute_domain";
import { generateEntityFilter } from "../../../common/entity/entity_filter";
import { formatNumber } from "../../../common/number/format_number";
import type { ActionHandlerEvent } from "../../../data/lovelace/action_handler";
import type { HomeAssistant } from "../../../types";
import { handleAction } from "../common/handle-action";
import { hasAction } from "../common/has-action";
import "../components/hui-tile";
import {
  findEntities,
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

  private _onAction = (ev: ActionHandlerEvent) => {
    this._handleAction(ev);
  };

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

    const label = getSummaryLabel(this.hass.localize, this._config.summary);
    const icon = HOME_SUMMARIES_ICONS[this._config.summary];
    const color = computeCssColor(COLORS[this._config.summary]);
    const secondary = this._computeSummaryState();

    const tileConfig = {
      name: label,
      icon,
      vertical: this._config.vertical,
      tapAction: this._config.tap_action,
      holdAction: this._config.hold_action,
      doubleTapAction: this._config.double_tap_action,
    };

    const tileState = {
      active: false, // Home summary cards don't have active state
      color,
      stateDisplay: html`<span>${secondary}</span>`,
    };

    return html`
      <hui-tile
        .hass=${this.hass}
        .config=${tileConfig}
        .state=${tileState}
        .hasCardAction=${this._hasCardAction}
        .onAction=${this._onAction}
      ></hui-tile>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-home-summary-card": HuiHomeSummaryCard;
  }
}
