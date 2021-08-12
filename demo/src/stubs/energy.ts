import { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

export const mockEnergy = (hass: MockHomeAssistant) => {
  hass.mockWS("energy/get_prefs", () => ({
    energy_sources: [
      {
        type: "grid",
        flow_from: [
          {
            stat_energy_from: "sensor.energy_consumption_tarif_1",
            stat_cost: "sensor.energy_consumption_tarif_1_cost",
            entity_energy_from: "sensor.energy_consumption_tarif_1",
            entity_energy_price: null,
            number_energy_price: null,
          },
          {
            stat_energy_from: "sensor.energy_consumption_tarif_2",
            stat_cost: "sensor.energy_consumption_tarif_2_cost",
            entity_energy_from: "sensor.energy_consumption_tarif_2",
            entity_energy_price: null,
            number_energy_price: null,
          },
        ],
        flow_to: [
          {
            stat_energy_to: "sensor.energy_production_tarif_1",
            stat_compensation: "sensor.energy_production_tarif_1_compensation",
            entity_energy_to: "sensor.energy_production_tarif_1",
            entity_energy_price: null,
            number_energy_price: null,
          },
          {
            stat_energy_to: "sensor.energy_production_tarif_2",
            stat_compensation: "sensor.energy_production_tarif_2_compensation",
            entity_energy_to: "sensor.energy_production_tarif_2",
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
      {
        type: "battery",
        stat_energy_from: "sensor.battery_output",
        stat_energy_to: "sensor.battery_input",
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
  }));
  hass.mockWS("energy/info", () => ({ cost_sensors: [] }));
};
