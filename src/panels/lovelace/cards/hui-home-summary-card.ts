import { endOfDay, startOfDay } from "date-fns";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { computeCssColor } from "../../../common/color/compute-color";
import { calcDate } from "../../../common/datetime/calc_date";
import { computeDomain } from "../../../common/entity/compute_domain";
import {
  findEntities,
  generateEntityFilter,
} from "../../../common/entity/entity_filter";
import { formatNumber } from "../../../common/number/format_number";
import "../../../components/ha-card";
import "../../../components/tile/ha-tile-container";
import "../../../components/tile/ha-tile-icon";
import "../../../components/tile/ha-tile-info";
import type { EnergyData } from "../../../data/energy";
import {
  computeConsumptionData,
  formatConsumptionShort,
  getEnergyDataCollection,
  getSummedData,
} from "../../../data/energy";
import type { ActionHandlerEvent } from "../../../data/lovelace/action_handler";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../types";
import { handleAction } from "../common/handle-action";
import { hasAction } from "../common/has-action";
import {
  getSummaryLabel,
  HOME_SUMMARIES_FILTERS,
  HOME_SUMMARIES_ICONS,
  type HomeSummary,
} from "../strategies/home/helpers/home-summaries";
import type { LovelaceCard, LovelaceGridOptions } from "../types";
import { tileCardStyle } from "./tile/tile-card-style";
import type { HomeSummaryCard } from "./types";

const COLORS: Record<HomeSummary, string> = {
  light: "amber",
  climate: "deep-orange",
  security: "blue-grey",
  media_players: "blue",
  energy: "amber",
};

@customElement("hui-home-summary-card")
export class HuiHomeSummaryCard
  extends SubscribeMixin(LitElement)
  implements LovelaceCard
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: HomeSummaryCard;

  @state() private _energyData?: EnergyData;

  protected hassSubscribeRequiredHostProps = ["_config"];

  public hassSubscribe(): UnsubscribeFunc[] {
    if (this._config?.summary !== "energy") {
      return [];
    }
    const collection = getEnergyDataCollection(this.hass!, {
      key: "energy_home_dashboard",
    });
    // Ensure we always show today's energy data
    collection.setPeriod(
      calcDate(new Date(), startOfDay, this.hass!.locale, this.hass!.config),
      calcDate(new Date(), endOfDay, this.hass!.locale, this.hass!.config)
    );
    return [
      collection.subscribe((data) => {
        this._energyData = data;
      }),
    ];
  }

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

    switch (this._config.summary) {
      case "light": {
        // Number of lights on
        const lightsFilters = HOME_SUMMARIES_FILTERS.light.map((filter) =>
          generateEntityFilter(this.hass!, filter)
        );

        const lightEntities = findEntities(allEntities, lightsFilters);

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

        const securityEntities = findEntities(allEntities, securityFilters);

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
          allEntities,
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
      case "energy": {
        if (!this._energyData) {
          return "";
        }
        const { summedData } = getSummedData(this._energyData);
        const { consumption } = computeConsumptionData(summedData, undefined);
        const totalConsumption = consumption.total.used_total;
        return formatConsumptionShort(this.hass, totalConsumption, "kWh");
      }
    }
    return "";
  }

  protected render() {
    if (!this._config || !this.hass) {
      return nothing;
    }

    const color = computeCssColor(COLORS[this._config.summary]);

    const style = {
      "--tile-color": color,
    };

    const secondary = this._computeSummaryState();

    const label = getSummaryLabel(this.hass.localize, this._config.summary);
    const icon = HOME_SUMMARIES_ICONS[this._config.summary];

    return html`
      <ha-card style=${styleMap(style)}>
        <ha-tile-container
          .vertical=${Boolean(this._config.vertical)}
          .interactive=${this._hasCardAction}
          .actionHandlerOptions=${{
            hasHold: hasAction(this._config!.hold_action),
            hasDoubleClick: hasAction(this._config!.double_tap_action),
          }}
          @action=${this._handleAction}
        >
          <ha-tile-icon slot="icon" .icon=${icon}></ha-tile-icon>
          <ha-tile-info
            slot="info"
            .primary=${label}
            .secondary=${secondary}
          ></ha-tile-info>
        </ha-tile-container>
      </ha-card>
    `;
  }

  static styles = [
    tileCardStyle,
    css`
      :host {
        --tile-color: var(--state-inactive-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-home-summary-card": HuiHomeSummaryCard;
  }
}
