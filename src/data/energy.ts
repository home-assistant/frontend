import { HomeAssistant } from "../types";

export const emptyFlowFromGridSourceEnergyPreference = (): FlowFromGridSourceEnergyPreference => ({
  stat_energy_from: "",
  stat_cost: null,
  entity_energy_from: null,
  entity_energy_price: null,
  number_energy_price: null,
});

export const emptyFlowToGridSourceEnergyPreference = (): FlowToGridSourceEnergyPreference => ({
  stat_energy_to: "",
  stat_compensation: null,
  entity_energy_to: null,
  entity_energy_price: null,
  number_energy_price: null,
});

export const emptyGridSourceEnergyPreference = (): GridSourceTypeEnergyPreference => ({
  type: "grid",
  flow_from: [],
  flow_to: [],
  cost_adjustment_day: 0,
});

export const emptySolarEnergyPreference = (): SolarSourceTypeEnergyPreference => ({
  type: "solar",
  stat_energy_from: "",
  stat_predicted_energy_from: null,
});

export interface DeviceConsumptionEnergyPreference {
  // This is an ever increasing value
  stat_consumption: string;
}

export interface FlowFromGridSourceEnergyPreference {
  // kWh meter
  stat_energy_from: string;

  // $ meter
  stat_cost: string | null;

  // Can be used to generate costs if stat_cost omitted
  entity_energy_from: string | null;
  entity_energy_price: string | null;
  number_energy_price: number | null;
}

export interface FlowToGridSourceEnergyPreference {
  // kWh meter
  stat_energy_to: string;

  // $ meter
  stat_compensation: string | null;

  // Can be used to generate costs if stat_cost omitted
  entity_energy_to: string | null;
  entity_energy_price: string | null;
  number_energy_price: number | null;
}

export interface GridSourceTypeEnergyPreference {
  type: "grid";

  flow_from: FlowFromGridSourceEnergyPreference[];
  flow_to: FlowToGridSourceEnergyPreference[];

  cost_adjustment_day: number;
}

export interface SolarSourceTypeEnergyPreference {
  type: "solar";

  stat_energy_from: string;
  stat_predicted_energy_from: string | null;
}

type EnergySource =
  | SolarSourceTypeEnergyPreference
  | GridSourceTypeEnergyPreference;

export interface EnergyPreferences {
  currency: string;
  energy_sources: EnergySource[];
  device_consumption: DeviceConsumptionEnergyPreference[];
  // home_consumption: HomeConsumptionEnergyPreference[];
  // production: ProductionEnergyPreference[];
}

export const getEnergyPreferences = (hass: HomeAssistant) =>
  hass.callWS<EnergyPreferences>({
    type: "energy/get_prefs",
  });

export const saveEnergyPreferences = (
  hass: HomeAssistant,
  prefs: Partial<EnergyPreferences>
) =>
  hass.callWS<EnergyPreferences>({
    type: "energy/save_prefs",
    ...prefs,
  });

interface EnergySourceByType {
  grid?: GridSourceTypeEnergyPreference[];
  solar?: SolarSourceTypeEnergyPreference[];
}

export const energySourcesByType = (prefs: EnergyPreferences) => {
  const types: EnergySourceByType = {};
  for (const source of prefs.energy_sources) {
    if (source.type in types) {
      types[source.type]!.push(source as any);
    } else {
      types[source.type] = [source as any];
    }
  }
  return types;
};
