import { HomeAssistant } from "../types";

interface EnergyPreferences {
  stat_house_energy_meter: string | null;

  stat_solar_generatation: string | null;
  stat_solar_return_to_grid: string | null;
  stat_solar_predicted_generation: string | null;

  stat_device_consumption: string[];

  schedule_tariff: null; // todo

  cost_kwh_low_tariff: number | null;
  cost_kwh_normal_tariff: number | null;

  cost_grid_management_day: number;
  cost_delivery_cost_day: number;

  cost_discount_energy_tax_day: number;
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
    type: "energy/get_prefs",
    ...prefs,
  });
