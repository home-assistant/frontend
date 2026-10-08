import { endOfDay, startOfDay } from "date-fns";
import type { HassConfig, HassEntities } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { computeCssColor } from "../../../common/color/compute-color";
import { calcDate } from "../../../common/datetime/calc_date";
import { consume } from "../../../common/decorators/consume";
import { transform } from "../../../common/decorators/transform";
import { fireEvent } from "../../../common/dom/fire_event";
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
import {
  configContext,
  internationalizationContext,
  registriesContext,
  statesContext,
} from "../../../data/context";
import type { EnergyData } from "../../../data/energy";
import {
  computeConsumptionData,
  formatConsumptionShort,
  getSummedData,
} from "../../../data/energy";
import { EnergyCollectionController } from "../../../data/energy-collection-controller";
import type { ActionHandlerEvent } from "../../../data/lovelace/action_handler";
import type {
  HomeAssistantConfig,
  HomeAssistantInternationalization,
  HomeAssistantRegistries,
} from "../../../types";
import { hasAction } from "../common/has-action";
import {
  getSummaryLabel,
  HOME_SUMMARIES_COLORS,
  HOME_SUMMARIES_FILTERS,
  HOME_SUMMARIES_ICONS,
  type HomeSummary,
} from "../strategies/home/helpers/home-summaries";
import {
  filterLowBatteryEntities,
  filterUnavailableBatteryEntities,
} from "../../maintenance/strategies/maintenance-view-strategy";
import {
  isSecurityAlertActive,
  resolveSecurityAlertSeverity,
} from "../../security/strategies/security-alerts";
import type { LovelaceCard, LovelaceGridOptions } from "../types";
import { tileCardStyle } from "./tile/tile-card-style";
import type { HomeSummaryCard } from "./types";

@customElement("hui-home-summary-card")
export class HuiHomeSummaryCard extends LitElement implements LovelaceCard {
  @state() private _config?: HomeSummaryCard;

  @state() private _energyData?: EnergyData;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: HomeAssistantInternationalization;

  @state()
  @consume({ context: registriesContext, subscribe: true })
  private _registries!: HomeAssistantRegistries;

  @consume({ context: configContext, subscribe: true })
  @transform<HomeAssistantConfig, HassConfig>({
    transformer: ({ config }) => config,
  })
  private _hassConfig!: HassConfig;

  @state()
  @consume({ context: statesContext, subscribe: true })
  @transform<HassEntities, string>({
    transformer: function (this: HuiHomeSummaryCard, states) {
      return this._computeSummaryState(states);
    },
    watch: ["_config", "_registries", "_i18n", "_energyData"],
  })
  private _summaryState?: string;

  constructor() {
    super();
    new EnergyCollectionController(this, {
      config: () =>
        this._config?.summary === "energy"
          ? { collection_key: "energy_home_dashboard" }
          : undefined,
      beforeSubscribe: (collection) => {
        // Ensure we always show today's energy data
        const { locale } = this._i18n;
        collection.setPeriod(
          calcDate(new Date(), startOfDay, locale, this._hassConfig),
          calcDate(new Date(), endOfDay, locale, this._hassConfig)
        );
      },
      onData: (data) => {
        this._energyData = data;
      },
    });
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
    fireEvent(this, "hass-action", {
      config: this._config!,
      action: ev.detail.action,
    });
  }

  private get _hasCardAction() {
    return (
      hasAction(this._config?.tap_action) ||
      hasAction(this._config?.hold_action) ||
      hasAction(this._config?.double_tap_action)
    );
  }

  private _computeSecondaryLoading = memoizeOne(
    (summary: HomeSummary, energyData: EnergyData | undefined): boolean =>
      summary === "energy" && !energyData
  );

  private _computeSummaryState(states: HassEntities | undefined): string {
    if (!this._config || !states || !this._registries || !this._i18n) {
      return "";
    }
    const { entities, devices, areas, floors } = this._registries;
    if (!entities || !devices || !areas || !floors) {
      return "";
    }
    const { localize, locale } = this._i18n;
    const allEntities = Object.keys(states);

    switch (this._config.summary) {
      case "light": {
        // Number of lights on
        const lightsFilters = HOME_SUMMARIES_FILTERS.light.map((filter) =>
          generateEntityFilter(states, entities, devices, areas, floors, filter)
        );

        const lightEntities = findEntities(allEntities, lightsFilters);

        const onLights = lightEntities.filter((entityId) => {
          const s = states[entityId]?.state;
          return s === "on";
        });

        return onLights.length
          ? localize("ui.card.home-summary.count_lights_on", {
              count: onLights.length,
            })
          : localize("ui.card.home-summary.all_lights_off");
      }
      case "climate": {
        // Min/Max temperature of the areas
        const areaSensors = Object.values(areas)
          .map((area) => area.temperature_entity_id)
          .filter(Boolean);

        const sensorsValues = areaSensors
          .map((entityId) => parseFloat(states[entityId!]?.state) || NaN)
          .filter((value) => !isNaN(value));

        if (sensorsValues.length === 0) {
          return "";
        }
        const minTemp = Math.min(...sensorsValues);
        const maxTemp = Math.max(...sensorsValues);

        if (isNaN(minTemp) || isNaN(maxTemp)) {
          return "";
        }

        const formattedMinTemp = formatNumber(minTemp, locale, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        });
        const formattedMaxTemp = formatNumber(maxTemp, locale, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        });
        return formattedMinTemp === formattedMaxTemp
          ? `${formattedMinTemp}°`
          : `${formattedMinTemp} - ${formattedMaxTemp}°`;
      }
      case "alerts": {
        const count = (this._config.alert_entities ?? []).filter(
          (alertEntity) => isSecurityAlertActive(states, alertEntity.entity)
        ).length;
        return count
          ? localize("ui.card.home-summary.count_active_alerts", {
              count,
            })
          : "";
      }
      case "security": {
        // Alarm and lock status
        const securityFilters = HOME_SUMMARIES_FILTERS.security.map((filter) =>
          generateEntityFilter(states, entities, devices, areas, floors, filter)
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
          const s = states[entityId]?.state;
          return s === "disarmed";
        });

        const warningCount = (this._config.alert_entities ?? []).filter(
          (alertEntity) =>
            resolveSecurityAlertSeverity(
              alertEntity,
              states[alertEntity.entity]
            ) === "warning" && isSecurityAlertActive(states, alertEntity.entity)
        ).length;
        const warningText = warningCount
          ? localize("ui.card.home-summary.count_warnings", {
              count: warningCount,
            })
          : undefined;

        if (!locks.length && !alarms.length) {
          return warningText ?? "";
        }

        const unlockedLocks = locks.filter((entityId) => {
          const s = states[entityId]?.state;
          return s === "unlocked" || s === "jammed" || s === "open";
        });

        const statusText = unlockedLocks.length
          ? localize("ui.card.home-summary.count_locks_unlocked", {
              count: unlockedLocks.length,
            })
          : disarmedAlarms.length
            ? localize("ui.card.home-summary.count_alarms_disarmed", {
                count: disarmedAlarms.length,
              })
            : warningText
              ? undefined
              : localize("ui.card.home-summary.all_secure");
        return [warningText, statusText].filter(Boolean).join(", ");
      }
      case "media_players": {
        // Playing media
        const mediaPlayerFilters = HOME_SUMMARIES_FILTERS.media_players.map(
          (filter) =>
            generateEntityFilter(
              states,
              entities,
              devices,
              areas,
              floors,
              filter
            )
        );

        const mediaPlayerEntities = findEntities(
          allEntities,
          mediaPlayerFilters
        );

        const playingMedia = mediaPlayerEntities.filter((entityId) => {
          const s = states[entityId]?.state;
          return s === "playing";
        });

        return playingMedia.length
          ? localize("ui.card.home-summary.count_media_playing", {
              count: playingMedia.length,
            })
          : localize("ui.card.home-summary.no_media_playing");
      }
      case "maintenance": {
        const maintenanceFilters = HOME_SUMMARIES_FILTERS.maintenance.map(
          (filter) =>
            generateEntityFilter(
              states,
              entities,
              devices,
              areas,
              floors,
              filter
            )
        );

        const maintenanceEntities = findEntities(
          allEntities,
          maintenanceFilters
        );

        const lowBatteryEntities = filterLowBatteryEntities(
          states,
          entities,
          maintenanceEntities
        );

        const unavailableBatteryEntities = filterUnavailableBatteryEntities(
          states,
          maintenanceEntities
        );

        const lowBatteryText =
          lowBatteryEntities.length > 0
            ? localize(
                "ui.card.home-summary.count_maintenance_low_battery_issues",
                {
                  count: lowBatteryEntities.length,
                }
              )
            : undefined;

        const unavailableText =
          unavailableBatteryEntities.length > 0
            ? localize(
                "ui.card.home-summary.count_maintenance_issues_unavailable_battery_entities",
                {
                  count: unavailableBatteryEntities.length,
                }
              )
            : undefined;

        if (lowBatteryText && unavailableText) {
          return `${lowBatteryText}, ${unavailableText}`;
        }

        if (lowBatteryText) {
          return lowBatteryText;
        }

        if (unavailableText) {
          return unavailableText;
        }

        return localize("ui.card.home-summary.all_maintenance_good");
      }
      case "energy": {
        if (!this._energyData) {
          return "";
        }
        const { summedData } = getSummedData(this._energyData);
        const { consumption } = computeConsumptionData(summedData, undefined);
        const totalConsumption = consumption.total.used_total;
        return formatConsumptionShort(locale, totalConsumption, "kWh");
      }
      case "persons": {
        const personsFilters = HOME_SUMMARIES_FILTERS.persons.map((filter) =>
          generateEntityFilter(states, entities, devices, areas, floors, filter)
        );
        const personEntities = findEntities(allEntities, personsFilters);
        const personsHome = personEntities.filter((entityId) => {
          const s = states[entityId]?.state;
          return s === "home";
        });
        return personsHome.length
          ? localize("ui.card.home-summary.count_persons_home", {
              count: personsHome.length,
            })
          : localize("ui.card.home-summary.nobody_home");
      }
    }
    return "";
  }

  protected render() {
    if (!this._config || !this._i18n) {
      return nothing;
    }

    const summary = this._config.summary;
    const isAlertsSummary = summary === "alerts";
    const color = computeCssColor(HOME_SUMMARIES_COLORS[summary]);

    const style = {
      "--tile-color": color,
      "--ha-alert-color": isAlertsSummary ? color : undefined,
    };

    const secondary = this._summaryState;
    const secondaryLoading = this._computeSecondaryLoading(
      summary,
      this._energyData
    );

    const label = getSummaryLabel(this._i18n.localize, summary);
    const icon = HOME_SUMMARIES_ICONS[summary];

    return html`
      <ha-card
        class=${classMap({ alert: isAlertsSummary })}
        style=${styleMap(style)}
      >
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
            .secondaryLoading=${secondaryLoading}
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
        --ha-alert-pulse-opacity: 0.3;
      }
      ha-card.alert {
        position: relative;
        overflow: hidden;
        --tile-color: var(--ha-alert-color);
      }
      ha-card.alert::before {
        position: absolute;
        inset: 0;
        border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg));
        background-color: var(--ha-alert-color);
        content: "";
        opacity: var(--ha-alert-pulse-opacity);
        pointer-events: none;
      }
      ha-card.alert ha-tile-container {
        position: relative;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-home-summary-card": HuiHomeSummaryCard;
  }
}
