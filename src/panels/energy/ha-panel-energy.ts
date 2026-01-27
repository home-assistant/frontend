import { mdiDownload } from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { navigate } from "../../common/navigate";
import type { LocalizeKeys } from "../../common/translations/localize";
import "../../components/ha-alert";
import "../../components/ha-icon-button-arrow-prev";
import "../../components/ha-menu-button";
import "../../components/ha-top-app-bar-fixed";
import type {
  BatterySourceTypeEnergyPreference,
  DeviceConsumptionEnergyPreference,
  EnergyPreferences,
  GasSourceTypeEnergyPreference,
  GridSourceTypeEnergyPreference,
  SolarSourceTypeEnergyPreference,
  WaterSourceTypeEnergyPreference,
} from "../../data/energy";
import {
  computeConsumptionData,
  getEnergyDataCollection,
  getSummedData,
} from "../../data/energy";
import type { LovelaceConfig } from "../../data/lovelace/config/types";
import {
  isStrategyView,
  type LovelaceViewConfig,
} from "../../data/lovelace/config/view";
import type { StatisticValue } from "../../data/recorder";
import { haStyle } from "../../resources/styles";
import type { HomeAssistant, PanelInfo } from "../../types";
import { fileDownload } from "../../util/file_download";
import "../lovelace/components/hui-energy-period-selector";
import "../lovelace/hui-root";
import type { ExtraActionItem } from "../lovelace/hui-root";
import type { Lovelace } from "../lovelace/types";
import "../lovelace/views/hui-view";
import "../lovelace/views/hui-view-container";

export const DEFAULT_ENERGY_COLLECTION_KEY = "energy_dashboard";

const EMPTY_PREFERENCES: EnergyPreferences = {
  energy_sources: [],
  device_consumption: [],
  device_consumption_water: [],
};

const OVERVIEW_VIEW = {
  path: "overview",
  strategy: {
    type: "energy-overview",
    collection_key: DEFAULT_ENERGY_COLLECTION_KEY,
    show_period_selector: true,
  },
} as LovelaceViewConfig;

const ENERGY_VIEW = {
  path: "electricity",
  strategy: {
    type: "energy",
    collection_key: DEFAULT_ENERGY_COLLECTION_KEY,
    show_period_selector: true,
  },
} as LovelaceViewConfig;

const WATER_VIEW = {
  path: "water",
  strategy: {
    type: "water",
    collection_key: DEFAULT_ENERGY_COLLECTION_KEY,
    show_period_selector: true,
  },
} as LovelaceViewConfig;

const GAS_VIEW = {
  path: "gas",
  strategy: {
    type: "gas",
    collection_key: DEFAULT_ENERGY_COLLECTION_KEY,
    show_period_selector: true,
  },
} as LovelaceViewConfig;

const POWER_VIEW = {
  path: "now",
  strategy: {
    type: "power",
    collection_key: "energy_dashboard_now",
  },
} as LovelaceViewConfig;

const WIZARD_VIEW = {
  type: "panel",
  path: "setup",
  cards: [{ type: "custom:energy-setup-wizard-card" }],
};

@customElement("ha-panel-energy")
class PanelEnergy extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ attribute: false }) public panel?: PanelInfo;

  @state() private _lovelace?: Lovelace;

  @property({ attribute: false }) public route?: {
    path: string;
    prefix: string;
  };

  @state()
  private _prefs?: EnergyPreferences;

  @state()
  private _error?: string;

  private get _extraActionItems(): ExtraActionItem[] {
    return [
      {
        icon: mdiDownload,
        labelKey: "ui.panel.energy.download_data",
        action: this._dumpCSV,
      },
    ];
  }

  public willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);
    // Initial setup
    if (!this.hasUpdated) {
      this.hass.loadFragmentTranslation("lovelace");
      this._loadConfig();
      return;
    }

    if (!changedProps.has("hass")) {
      return;
    }

    const oldHass = changedProps.get("hass") as this["hass"];
    if (this._lovelace && oldHass && oldHass.localize !== this.hass.localize) {
      this._setLovelace();
    }
  }

  private _fetchEnergyPrefs = async (): Promise<
    EnergyPreferences | undefined
  > => {
    const collection = getEnergyDataCollection(this.hass, {
      key: DEFAULT_ENERGY_COLLECTION_KEY,
    });
    try {
      await collection.refresh();
    } catch (err: any) {
      if (err.code === "not_found") {
        return undefined;
      }
      throw err;
    }
    return collection.prefs;
  };

  private async _loadConfig() {
    try {
      this._error = undefined;
      const prefs = await this._fetchEnergyPrefs();
      this._prefs = prefs || EMPTY_PREFERENCES;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to load prefs:", err);
      this._prefs = EMPTY_PREFERENCES;
      this._error = (err as Error).message || "Unknown error";
    }
    await this._setLovelace();

    // Check if current path is valid, navigate to first view if not
    const views = this._lovelace!.config?.views || [];
    const validPaths = views.map((view) => view.path);
    const viewPath: string | undefined = this.route!.path.split("/")[1];
    if (!viewPath || !validPaths.includes(viewPath)) {
      navigate(`${this.route!.prefix}/${validPaths[0]}`, { replace: true });
    } else {
      // Force hui-root to re-process the route by creating a new route object
      this.route = { ...this.route! };
    }
  }

  private async _setLovelace() {
    const config = await this._generateLovelaceConfig();

    this._lovelace = {
      config: config,
      rawConfig: config,
      editMode: false,
      urlPath: "energy",
      mode: "generated",
      locale: this.hass.locale,
      enableFullEditMode: () => undefined,
      saveConfig: async () => undefined,
      deleteConfig: async () => undefined,
      setEditMode: () => this._navigateConfig(),
      showToast: () => undefined,
    };
  }

  protected render() {
    if (this._error) {
      return html`
        <div class="centered">
          <ha-alert alert-type="error">
            An error occurred loading energy preferences: ${this._error}
          </ha-alert>
        </div>
      `;
    }

    if (!this._prefs) {
      // Still loading
      return html`
        <div class="centered">
          <ha-spinner size="large"></ha-spinner>
        </div>
      `;
    }

    if (!this._lovelace) {
      return nothing;
    }

    const routePath = this.route?.path?.split("/")[1] || "";
    const currentView = this._lovelace.config.views.find(
      (view) => view.path === routePath
    );

    const showEnergySelector =
      currentView &&
      isStrategyView(currentView) &&
      currentView.strategy?.show_period_selector;

    return html`
      <hui-root
        .hass=${this.hass}
        .narrow=${this.narrow}
        .lovelace=${this._lovelace}
        .route=${this.route}
        .panel=${this.panel}
        .extraActionItems=${this._extraActionItems}
        @reload-energy-panel=${this._reloadConfig}
        class=${classMap({ "has-period-selector": showEnergySelector })}
      >
      </hui-root>
      ${showEnergySelector
        ? html`
            <ha-card class="period-selector">
              <hui-energy-period-selector
                .hass=${this.hass}
                .collectionKey=${DEFAULT_ENERGY_COLLECTION_KEY}
                vertical-opening-direction="up"
                fixed
              ></hui-energy-period-selector>
            </ha-card>
          `
        : nothing}
    `;
  }

  private async _generateLovelaceConfig(): Promise<LovelaceConfig> {
    if (
      !this._prefs ||
      (this._prefs.device_consumption.length === 0 &&
        this._prefs.energy_sources.length === 0)
    ) {
      await import("./cards/energy-setup-wizard-card");
      return {
        views: [WIZARD_VIEW],
      };
    }

    const hasEnergy = this._prefs.energy_sources.some((source) =>
      ["grid", "solar", "battery"].includes(source.type)
    );

    const hasPowerSource = this._prefs.energy_sources.some(
      (source) =>
        (source.type === "solar" && source.stat_rate) ||
        (source.type === "battery" && source.stat_rate) ||
        (source.type === "grid" && source.power?.length)
    );

    const hasDevicePower = this._prefs.device_consumption.some(
      (device) => device.stat_rate
    );

    const hasPower = hasPowerSource || hasDevicePower;

    const hasWater =
      this._prefs.energy_sources.some((source) => source.type === "water") ||
      this._prefs.device_consumption_water?.length > 0;

    const hasGas = this._prefs.energy_sources.some(
      (source) => source.type === "gas"
    );

    const hasDeviceConsumption = this._prefs.device_consumption.length > 0;

    const views: LovelaceViewConfig[] = [];
    if (hasEnergy || hasDeviceConsumption) {
      views.push(ENERGY_VIEW);
    }
    if (hasGas) {
      views.push(GAS_VIEW);
    }
    if (hasWater) {
      views.push(WATER_VIEW);
    }
    if (hasPower) {
      views.push(POWER_VIEW);
    }
    if (
      hasPowerSource ||
      [hasEnergy, hasGas, hasWater].filter(Boolean).length > 1
    ) {
      views.unshift(OVERVIEW_VIEW);
    }
    return {
      views: views.map((view) => ({
        ...view,
        title:
          view.title ||
          this.hass.localize(
            `ui.panel.energy.title.${view.path}` as LocalizeKeys
          ),
      })),
    };
  }

  private _navigateConfig(ev?: Event) {
    ev?.stopPropagation();
    navigate("/config/energy?historyBack=1");
  }

  private _dumpCSV = async () => {
    const energyData = getEnergyDataCollection(this.hass, {
      key: "energy_dashboard",
    });

    if (!energyData.prefs || !energyData.state.stats) {
      return;
    }

    const gasUnit = energyData.state.gasUnit;
    const electricUnit = "kWh";

    const energy_sources = energyData.prefs.energy_sources;
    const device_consumption = energyData.prefs.device_consumption;
    const device_consumption_water = energyData.prefs.device_consumption_water;
    const stats = energyData.state.stats;

    const timeSet = new Set<number>();
    Object.values(stats).forEach((stat) => {
      stat.forEach((datapoint) => {
        timeSet.add(datapoint.start);
      });
    });
    const times = Array.from(timeSet).sort();

    const headers =
      "entity_id,type,unit," +
      times.map((t) => new Date(t).toISOString()).join(",") +
      "\n";
    const csv: string[] = [];
    csv[0] = headers;

    const processCsvRow = function (
      id: string,
      type: string,
      unit: string,
      data: StatisticValue[]
    ) {
      let n = 0;
      const row: string[] = [];
      row.push(id);
      row.push(type);
      row.push(unit.normalize("NFKD"));
      times.forEach((t) => {
        if (n < data.length && data[n].start === t) {
          row.push((data[n].change ?? "").toString());
          n++;
        } else {
          row.push("");
        }
      });
      csv.push(row.join(",") + "\n");
    };

    const processStat = function (stat: string, type: string, unit: string) {
      if (!stats[stat]) {
        return;
      }

      processCsvRow(stat, type, unit, stats[stat]);
    };

    const currency = this.hass.config.currency;

    const printCategory = function (
      type: string,
      statIds: string[],
      unit: string,
      costType?: string,
      costStatIds?: string[]
    ) {
      if (statIds.length) {
        statIds.forEach((stat) => processStat(stat, type, unit));
        if (costType && costStatIds) {
          costStatIds.forEach((stat) => processStat(stat, costType, currency));
        }
      }
    };

    const grid_consumptions: string[] = [];
    const grid_productions: string[] = [];
    const grid_consumptions_cost: string[] = [];
    const grid_productions_cost: string[] = [];
    energy_sources
      .filter((s) => s.type === "grid")
      .forEach((source) => {
        source = source as GridSourceTypeEnergyPreference;
        source.flow_from.forEach((flowFrom) => {
          const statId = flowFrom.stat_energy_from;
          grid_consumptions.push(statId);
          const costId =
            flowFrom.stat_cost || energyData.state.info.cost_sensors[statId];
          if (costId) {
            grid_consumptions_cost.push(costId);
          }
        });
        source.flow_to.forEach((flowTo) => {
          const statId = flowTo.stat_energy_to;
          grid_productions.push(statId);
          const costId =
            flowTo.stat_compensation ||
            energyData.state.info.cost_sensors[statId];
          if (costId) {
            grid_productions_cost.push(costId);
          }
        });
      });

    printCategory(
      "grid_consumption",
      grid_consumptions,
      electricUnit,
      "grid_consumption_cost",
      grid_consumptions_cost
    );
    printCategory(
      "grid_return",
      grid_productions,
      electricUnit,
      "grid_return_compensation",
      grid_productions_cost
    );

    const battery_ins: string[] = [];
    const battery_outs: string[] = [];
    energy_sources
      .filter((s) => s.type === "battery")
      .forEach((source) => {
        source = source as BatterySourceTypeEnergyPreference;
        battery_ins.push(source.stat_energy_to);
        battery_outs.push(source.stat_energy_from);
      });

    printCategory("battery_in", battery_ins, electricUnit);
    printCategory("battery_out", battery_outs, electricUnit);

    const solar_productions: string[] = [];
    energy_sources
      .filter((s) => s.type === "solar")
      .forEach((source) => {
        source = source as SolarSourceTypeEnergyPreference;
        solar_productions.push(source.stat_energy_from);
      });

    printCategory("solar_production", solar_productions, electricUnit);

    const gas_consumptions: string[] = [];
    const gas_consumptions_cost: string[] = [];
    energy_sources
      .filter((s) => s.type === "gas")
      .forEach((source) => {
        source = source as GasSourceTypeEnergyPreference;
        const statId = source.stat_energy_from;
        gas_consumptions.push(statId);
        const costId =
          source.stat_cost || energyData.state.info.cost_sensors[statId];
        if (costId) {
          gas_consumptions_cost.push(costId);
        }
      });

    printCategory(
      "gas_consumption",
      gas_consumptions,
      gasUnit,
      "gas_consumption_cost",
      gas_consumptions_cost
    );

    const water_consumptions: string[] = [];
    const water_consumptions_cost: string[] = [];
    energy_sources
      .filter((s) => s.type === "water")
      .forEach((source) => {
        source = source as WaterSourceTypeEnergyPreference;
        const statId = source.stat_energy_from;
        water_consumptions.push(statId);
        const costId =
          source.stat_cost || energyData.state.info.cost_sensors[statId];
        if (costId) {
          water_consumptions_cost.push(costId);
        }
      });

    printCategory(
      "water_consumption",
      water_consumptions,
      energyData.state.waterUnit,
      "water_consumption_cost",
      water_consumptions_cost
    );

    const devices: string[] = [];
    device_consumption.forEach((source) => {
      source = source as DeviceConsumptionEnergyPreference;
      devices.push(source.stat_consumption);
    });

    printCategory("device_consumption", devices, electricUnit);

    if (device_consumption_water) {
      const waterDevices: string[] = [];
      device_consumption_water.forEach((source) => {
        source = source as DeviceConsumptionEnergyPreference;
        waterDevices.push(source.stat_consumption);
      });

      printCategory(
        "device_consumption_water",
        waterDevices,
        energyData.state.waterUnit
      );
    }

    const { summedData, compareSummedData: _ } = getSummedData(
      energyData.state
    );
    const { consumption, compareConsumption: __ } = computeConsumptionData(
      summedData,
      undefined
    );

    const processConsumptionData = function (
      type: string,
      unit: string,
      data: Record<number, number>
    ) {
      const data2: StatisticValue[] = [];

      Object.entries(data).forEach(([t, value]) => {
        data2.push({
          start: Number(t),
          end: NaN,
          change: value,
        });
      });

      processCsvRow("", type, unit, data2);
    };

    const hasSolar = !!solar_productions.length;
    const hasBattery = !!battery_ins.length;
    const hasGridReturn = !!grid_productions.length;
    const hasGridSource = !!grid_consumptions.length;

    if (hasGridSource) {
      processConsumptionData(
        "calculated_consumed_grid",
        electricUnit,
        consumption.used_grid
      );
      if (hasBattery) {
        processConsumptionData(
          "calculated_grid_to_battery",
          electricUnit,
          consumption.grid_to_battery
        );
      }
    }
    if (hasGridReturn && hasBattery) {
      processConsumptionData(
        "calculated_battery_to_grid",
        electricUnit,
        consumption.battery_to_grid
      );
    }
    if (hasBattery) {
      processConsumptionData(
        "calculated_consumed_battery",
        electricUnit,
        consumption.used_battery
      );
    }

    if (hasSolar) {
      processConsumptionData(
        "calculated_consumed_solar",
        electricUnit,
        consumption.used_solar
      );
      if (hasBattery) {
        processConsumptionData(
          "calculated_solar_to_battery",
          electricUnit,
          consumption.solar_to_battery
        );
      }
      if (hasGridReturn) {
        processConsumptionData(
          "calculated_solar_to_grid",
          electricUnit,
          consumption.solar_to_grid
        );
      }
    }

    if (
      (hasGridSource ? 1 : 0) + (hasSolar ? 1 : 0) + (hasBattery ? 1 : 0) >
      1
    ) {
      processConsumptionData(
        "calculated_total_consumption",
        electricUnit,
        consumption.used_total
      );
    }

    const blob = new Blob(csv, {
      type: "text/csv",
    });
    const url = window.URL.createObjectURL(blob);
    fileDownload(url, "energy.csv");
  };

  private _reloadConfig() {
    this._loadConfig();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          --ha-view-sections-column-max-width: 100%;
          -ms-user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
        }
        .centered {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        hui-root.has-period-selector {
          --view-container-padding-bottom: var(--ha-space-18);
        }
        .period-selector {
          position: fixed;
          z-index: 4;
          bottom: max(var(--ha-space-4), var(--safe-area-inset-bottom, 0px));
          left: max(
            var(--mdc-drawer-width, 0px),
            var(--safe-area-inset-left, 0px)
          );
          right: var(--safe-area-inset-right, 0);
          inset-inline-start: max(
            var(--mdc-drawer-width, 0px),
            var(--safe-area-inset-left, 0px)
          );
          inset-inline-end: var(--safe-area-inset-right, 0);
          margin: 0 auto;
          max-width: calc(min(470px, 100% - var(--ha-space-4)));
          box-sizing: border-box;
          padding-left: var(--ha-space-2);
          padding-right: 0;
          padding-inline-start: var(--ha-space-4);
          padding-inline-end: 0;
          --ha-card-box-shadow:
            0px 3px 5px -1px rgba(0, 0, 0, 0.2),
            0px 6px 10px 0px rgba(0, 0, 0, 0.14),
            0px 1px 18px 0px rgba(0, 0, 0, 0.12);
          --ha-card-border-color: var(--divider-color);
          --ha-card-border-width: var(--ha-card-border-width, 1px);
        }
        @media all and (max-width: 450px), all and (max-height: 500px) {
          hui-root.has-period-selector {
            --view-container-padding-bottom: var(--ha-space-14);
          }
          .period-selector {
            bottom: max(var(--ha-space-2), var(--safe-area-inset-bottom, 0px));
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-panel-energy": PanelEnergy;
  }
}

declare global {
  interface HASSDomEvents {
    "reload-energy-panel": undefined;
  }
}
