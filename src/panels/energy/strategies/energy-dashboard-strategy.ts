import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { getEnergyDataCollection } from "../../../data/energy";
import type { EnergyPreferences } from "../../../data/energy";
import type { LovelaceStrategyConfig } from "../../../data/lovelace/config/strategy";
import type { LovelaceConfig } from "../../../data/lovelace/config/types";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import type { LocalizeKeys } from "../../../common/translations/localize";
import type { HomeAssistant } from "../../../types";
import {
  DEFAULT_ENERGY_COLLECTION_KEY,
  DEFAULT_POWER_COLLECTION_KEY,
} from "../constants";

const OVERVIEW_VIEW = {
  path: "overview",
  strategy: {
    type: "energy-overview",
    collection_key: DEFAULT_ENERGY_COLLECTION_KEY,
  },
} as LovelaceViewConfig;

const ENERGY_VIEW = {
  path: "electricity",
  strategy: {
    type: "energy",
    collection_key: DEFAULT_ENERGY_COLLECTION_KEY,
  },
} as LovelaceViewConfig;

const WATER_VIEW = {
  path: "water",
  strategy: {
    type: "water",
    collection_key: DEFAULT_ENERGY_COLLECTION_KEY,
  },
} as LovelaceViewConfig;

const GAS_VIEW = {
  path: "gas",
  strategy: {
    type: "gas",
    collection_key: DEFAULT_ENERGY_COLLECTION_KEY,
  },
} as LovelaceViewConfig;

const POWER_VIEW = {
  path: "now",
  strategy: {
    type: "power",
    collection_key: DEFAULT_POWER_COLLECTION_KEY,
  },
} as LovelaceViewConfig;

const WIZARD_VIEW = {
  type: "panel",
  path: "setup",
  cards: [{ type: "custom:energy-setup-wizard-card" }],
};

const EMPTY_PREFERENCES: EnergyPreferences = {
  energy_sources: [],
  device_consumption: [],
  device_consumption_water: [],
};

export interface EnergyDashboardStrategyConfig extends LovelaceStrategyConfig {
  type: "energy";
}

@customElement("energy-dashboard-strategy")
export class EnergyDashboardStrategy extends ReactiveElement {
  static async generate(
    _config: EnergyDashboardStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceConfig> {
    const prefs = await fetchEnergyPrefs(hass);

    if (
      !prefs ||
      (prefs.device_consumption.length === 0 &&
        prefs.energy_sources.length === 0)
    ) {
      await import("../cards/energy-setup-wizard-card");
      return {
        views: [WIZARD_VIEW],
      };
    }

    const hasEnergy = prefs.energy_sources.some((source) =>
      ["grid", "solar", "battery"].includes(source.type)
    );

    const hasPowerSource = prefs.energy_sources.some((source) => {
      if (source.type === "solar" && source.stat_rate) return true;
      if (source.type === "battery" && source.stat_rate) return true;
      if (source.type === "grid") {
        return !!source.stat_rate || !!source.power_config;
      }
      return false;
    });

    const hasDevicePower = prefs.device_consumption.some(
      (device) => device.stat_rate
    );

    const hasPower = hasPowerSource || hasDevicePower;

    const hasWater =
      prefs.energy_sources.some((source) => source.type === "water") ||
      prefs.device_consumption_water?.length > 0;

    const hasGas = prefs.energy_sources.some((source) => source.type === "gas");

    const hasDeviceConsumption = prefs.device_consumption.length > 0;

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
          hass.localize(`ui.panel.energy.title.${view.path}` as LocalizeKeys),
      })),
    };
  }

  static noEditor = true;
}

async function fetchEnergyPrefs(
  hass: HomeAssistant
): Promise<EnergyPreferences> {
  const collection = getEnergyDataCollection(hass, {
    key: DEFAULT_ENERGY_COLLECTION_KEY,
  });
  try {
    await collection.refresh();
  } catch (err: any) {
    if (err.code === "not_found") {
      return EMPTY_PREFERENCES;
    }
    throw err;
  }
  return collection.prefs || EMPTY_PREFERENCES;
}

declare global {
  interface HTMLElementTagNameMap {
    "energy-dashboard-strategy": EnergyDashboardStrategy;
  }
}
