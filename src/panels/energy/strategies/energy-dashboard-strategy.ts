import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import {
  EMPTY_PREFERENCES,
  getEnergyDataCollection,
} from "../../../data/energy";
import type { EnergyPreferences } from "../../../data/energy";
import type { LovelaceStrategyConfig } from "../../../data/lovelace/config/strategy";
import type { LovelaceConfig } from "../../../data/lovelace/config/types";
import type { LovelaceStrategyViewConfig } from "../../../data/lovelace/config/view";
import type { LocalizeKeys } from "../../../common/translations/localize";
import type { HomeAssistant } from "../../../types";
import type { LovelaceStrategyDependency } from "../../lovelace/strategies/types";
import {
  DEFAULT_ENERGY_COLLECTION_KEY,
  DEFAULT_POWER_COLLECTION_KEY,
} from "../constants";
import type { EnergyViewPath } from "./energy-cards";
import { isEnergyViewEmpty } from "./energy-cards";

const OVERVIEW_VIEW = {
  path: "overview",
  strategy: {
    type: "energy-overview",
    collection_key: DEFAULT_ENERGY_COLLECTION_KEY,
  },
} as LovelaceStrategyViewConfig;

const ENERGY_VIEW = {
  path: "electricity",
  strategy: {
    type: "energy",
    collection_key: DEFAULT_ENERGY_COLLECTION_KEY,
  },
} as LovelaceStrategyViewConfig;

const WATER_VIEW = {
  path: "water",
  strategy: {
    type: "water",
    collection_key: DEFAULT_ENERGY_COLLECTION_KEY,
  },
} as LovelaceStrategyViewConfig;

const GAS_VIEW = {
  path: "gas",
  strategy: {
    type: "gas",
    collection_key: DEFAULT_ENERGY_COLLECTION_KEY,
  },
} as LovelaceStrategyViewConfig;

const POWER_VIEW = {
  path: "now",
  strategy: {
    type: "power",
    collection_key: DEFAULT_POWER_COLLECTION_KEY,
  },
} as LovelaceStrategyViewConfig;

const WIZARD_VIEW = {
  type: "panel",
  path: "setup",
  cards: [{ type: "custom:energy-setup-wizard-card" }],
};

export interface EnergyDashboardStrategyConfig extends LovelaceStrategyConfig {
  type: "energy";
  default_collection?: string;
  hidden_cards?: string[];
}

@customElement("energy-dashboard-strategy")
export class EnergyDashboardStrategy extends ReactiveElement {
  static registryDependencies: readonly LovelaceStrategyDependency[] = [];

  static async generate(
    _config: EnergyDashboardStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceConfig> {
    const prefs = await fetchEnergyPrefs(hass, _config.default_collection);

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

    const hidden = _config.hidden_cards;

    const candidateViews: LovelaceStrategyViewConfig[] = [];
    if (hasEnergy || hasDeviceConsumption) {
      candidateViews.push(ENERGY_VIEW);
    }
    if (hasGas) {
      candidateViews.push(GAS_VIEW);
    }
    if (hasWater) {
      candidateViews.push(WATER_VIEW);
    }
    if (hasPower) {
      candidateViews.push(POWER_VIEW);
    }
    if (
      hasPowerSource ||
      [hasEnergy, hasGas, hasWater].filter(Boolean).length > 1
    ) {
      candidateViews.unshift(OVERVIEW_VIEW);
    }

    // Drop a view (tab) when every card it would render has been hidden, so we
    // don't show an empty tab. Keep at least one view so the dashboard never
    // renders blank and the customize entry stays reachable.
    let views = candidateViews.filter(
      (view) => !isEnergyViewEmpty(view.path as EnergyViewPath, prefs, hidden)
    );
    if (views.length === 0) {
      views = candidateViews;
    }

    return {
      views: views.map((view) => ({
        ...view,
        strategy: { ...view.strategy, hidden_cards: hidden },
        title:
          view.title ||
          hass.localize(`ui.panel.energy.title.${view.path}` as LocalizeKeys),
      })),
    };
  }

  static noEditor = true;
}

async function fetchEnergyPrefs(
  hass: HomeAssistant,
  defaultCollection?: string
): Promise<EnergyPreferences> {
  const collection = getEnergyDataCollection(hass, {
    key: defaultCollection || DEFAULT_ENERGY_COLLECTION_KEY,
  });

  return await new Promise<EnergyPreferences>((resolve) => {
    const unsub = collection.subscribe((data) => {
      unsub();
      resolve(data.prefs || EMPTY_PREFERENCES);
    });
  });
}

declare global {
  interface HTMLElementTagNameMap {
    "energy-dashboard-strategy": EnergyDashboardStrategy;
  }
}
