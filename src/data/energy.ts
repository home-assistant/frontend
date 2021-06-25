import { HomeAssistant } from "../types";

export const emptyHomeConsumptionEnergyPreference = (): HomeConsumptionEnergyPreference => ({
  stat_consumption: "",
  entity_consumption: null,
  stat_cost: null,
  entity_energy_price: null,
  cost_adjustment_day: 0,
});

export const emptyProductionEnergyPreference = (): ProductionEnergyPreference => ({
  type: "solar",

  stat_production: "",
  stat_return_to_grid: null,
  stat_predicted_production: null,
});

export interface HomeConsumptionEnergyPreference {
  // This is an ever increasing value
  stat_consumption: string;
  entity_consumption: string | null;

  // Points at a sensor that contains the cost
  stat_cost: string | null;

  entity_energy_price: string | null;
  cost_adjustment_day: number;
}

export interface DeviceConsumptionEnergyPreference {
  // This is an ever increasing value
  stat_consumption: string;
}

export interface ProductionEnergyPreference {
  type: "solar" | "wind";

  stat_production: string;
  stat_return_to_grid: string | null;
  stat_predicted_production: string | null;
}

export interface EnergyPreferences {
  currency: string;
  home_consumption: HomeConsumptionEnergyPreference[];
  device_consumption: DeviceConsumptionEnergyPreference[];
  production: ProductionEnergyPreference[];
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
