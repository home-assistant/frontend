import { format, startOfToday, startOfTomorrow } from "date-fns/esm";
import {
  EnergyInfo,
  EnergyPreferences,
  EnergySolarForecasts,
  FossilEnergyConsumption,
} from "../../../src/data/energy";
import { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

export const mockEnergy = (hass: MockHomeAssistant) => {
  hass.mockWS(
    "energy/get_prefs",
    (): EnergyPreferences => ({
      energy_sources: [
        {
          type: "grid",
          flow_from: [
            {
              stat_energy_from: "sensor.energy_consumption_tarif_1",
              stat_cost: "sensor.energy_consumption_tarif_1_cost",
              entity_energy_price: null,
              number_energy_price: null,
            },
            {
              stat_energy_from: "sensor.energy_consumption_tarif_2",
              stat_cost: "sensor.energy_consumption_tarif_2_cost",
              entity_energy_price: null,
              number_energy_price: null,
            },
          ],
          flow_to: [
            {
              stat_energy_to: "sensor.energy_production_tarif_1",
              stat_compensation:
                "sensor.energy_production_tarif_1_compensation",
              entity_energy_price: null,
              number_energy_price: null,
            },
            {
              stat_energy_to: "sensor.energy_production_tarif_2",
              stat_compensation:
                "sensor.energy_production_tarif_2_compensation",
              entity_energy_price: null,
              number_energy_price: null,
            },
          ],
          cost_adjustment_day: 0,
        },
        {
          type: "solar",
          stat_energy_from: "sensor.solar_production",
          config_entry_solar_forecast: ["solar_forecast"],
        },
        /*         {
          type: "battery",
          stat_energy_from: "sensor.battery_output",
          stat_energy_to: "sensor.battery_input",
        }, */
        {
          type: "gas",
          stat_energy_from: "sensor.energy_gas",
          stat_cost: "sensor.energy_gas_cost",
          entity_energy_price: null,
          number_energy_price: null,
        },
      ],
      device_consumption: [
        {
          stat_consumption: "sensor.energy_car",
        },
        {
          stat_consumption: "sensor.energy_ac",
        },
        {
          stat_consumption: "sensor.energy_washing_machine",
        },
        {
          stat_consumption: "sensor.energy_dryer",
        },
        {
          stat_consumption: "sensor.energy_heat_pump",
        },
        {
          stat_consumption: "sensor.energy_boiler",
        },
      ],
    })
  );
  hass.mockWS(
    "energy/info",
    (): EnergyInfo => ({ cost_sensors: {}, solar_forecast_domains: [] })
  );
  hass.mockWS(
    "energy/fossil_energy_consumption",
    ({ period }): FossilEnergyConsumption => ({
      start: period === "month" ? 250 : period === "day" ? 10 : 2,
    })
  );
  const todayString = format(startOfToday(), "yyyy-MM-dd");
  const tomorrowString = format(startOfTomorrow(), "yyyy-MM-dd");
  hass.mockWS(
    "energy/solar_forecast",
    (): EnergySolarForecasts => ({
      solar_forecast: {
        wh_hours: {
          [`${todayString}T06:00:00`]: 0,
          [`${todayString}T06:23:00`]: 6,
          [`${todayString}T06:45:00`]: 39,
          [`${todayString}T07:00:00`]: 28,
          [`${todayString}T08:00:00`]: 208,
          [`${todayString}T09:00:00`]: 352,
          [`${todayString}T10:00:00`]: 544,
          [`${todayString}T11:00:00`]: 748,
          [`${todayString}T12:00:00`]: 1259,
          [`${todayString}T13:00:00`]: 1361,
          [`${todayString}T14:00:00`]: 1373,
          [`${todayString}T15:00:00`]: 1370,
          [`${todayString}T16:00:00`]: 1186,
          [`${todayString}T17:00:00`]: 937,
          [`${todayString}T18:00:00`]: 652,
          [`${todayString}T19:00:00`]: 370,
          [`${todayString}T20:00:00`]: 155,
          [`${todayString}T21:48:00`]: 24,
          [`${todayString}T22:36:00`]: 0,
          [`${tomorrowString}T06:01:00`]: 0,
          [`${tomorrowString}T06:23:00`]: 9,
          [`${tomorrowString}T06:45:00`]: 47,
          [`${tomorrowString}T07:00:00`]: 48,
          [`${tomorrowString}T08:00:00`]: 473,
          [`${tomorrowString}T09:00:00`]: 827,
          [`${tomorrowString}T10:00:00`]: 1153,
          [`${tomorrowString}T11:00:00`]: 1413,
          [`${tomorrowString}T12:00:00`]: 1590,
          [`${tomorrowString}T13:00:00`]: 1652,
          [`${tomorrowString}T14:00:00`]: 1612,
          [`${tomorrowString}T15:00:00`]: 1438,
          [`${tomorrowString}T16:00:00`]: 1149,
          [`${tomorrowString}T17:00:00`]: 830,
          [`${tomorrowString}T18:00:00`]: 542,
          [`${tomorrowString}T19:00:00`]: 311,
          [`${tomorrowString}T20:00:00`]: 140,
          [`${tomorrowString}T21:47:00`]: 22,
          [`${tomorrowString}T22:34:00`]: 0,
        },
      },
    })
  );
};
