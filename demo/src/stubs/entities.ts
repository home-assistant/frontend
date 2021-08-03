import { convertEntities } from "../../../src/fake_data/entity";

export const energyEntities = () =>
  convertEntities({
    "sensor.grid_fossil_fuel_percentage": {
      entity_id: "sensor.grid_fossil_fuel_percentage",
      state: "88.6",
      attributes: {
        unit_of_measurement: "%",
      },
    },
  });
