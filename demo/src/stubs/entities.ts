import { convertEntities } from "../../../src/fake_data/entity";

export const mapEntities = () =>
  convertEntities({
    "zone.home": {
      entity_id: "zone.home",
      state: "zoning",
      attributes: {
        hidden: true,
        latitude: 52.3631339,
        longitude: 4.8903147,
        radius: 200,
        friendly_name: "Home",
        icon: "hademo:home",
      },
    },
    "zone.uva": {
      entity_id: "zone.buckhead",
      state: "zoning",
      attributes: {
        hidden: true,
        radius: 400,
        friendly_name: "UvA",
        icon: "hademo:school",
        latitude: 52.3558182,
        longitude: 4.9535376,
      },
    },
    "person.arsaboo": {
      entity_id: "person.arsaboo",
      state: "not_home",
      attributes: {
        radius: 50,
        friendly_name: "Arsaboo",
        latitude: 52.3579946,
        longitude: 4.8664597,
        entity_picture: "/assets/arsaboo/images/arsaboo.jpg",
      },
    },
    "person.melody": {
      entity_id: "person.melody",
      state: "not_home",
      attributes: {
        radius: 50,
        friendly_name: "Melody",
        latitude: 52.3408927,
        longitude: 4.8711073,
        entity_picture: "/assets/arsaboo/images/melody.jpg",
      },
    },
  });

export const energyEntities = () =>
  convertEntities({
    "sensor.grid_fossil_fuel_percentage": {
      entity_id: "sensor.grid_fossil_fuel_percentage",
      state: "88.6",
      attributes: {
        unit_of_measurement: "%",
      },
    },
    "sensor.solar_production": {
      entity_id: "sensor.solar_production",
      state: "88.6",
      attributes: {
        last_reset: "1970-01-01T00:00:00:00+00",
        friendly_name: "Solar",
        unit_of_measurement: "kWh",
      },
    },
    "sensor.battery_input": {
      entity_id: "sensor.battery_input",
      state: "4",
      attributes: {
        last_reset: "1970-01-01T00:00:00:00+00",
        friendly_name: "Battery Input",
        unit_of_measurement: "kWh",
      },
    },
    "sensor.battery_output": {
      entity_id: "sensor.battery_output",
      state: "3",
      attributes: {
        last_reset: "1970-01-01T00:00:00:00+00",
        friendly_name: "Battery Output",
        unit_of_measurement: "kWh",
      },
    },
    "sensor.energy_consumption_tarif_1": {
      entity_id: "sensor.energy_consumption_tarif_1	",
      state: "88.6",
      attributes: {
        last_reset: "1970-01-01T00:00:00:00+00",
        friendly_name: "Grid consumption low tariff",
        unit_of_measurement: "kWh",
      },
    },
    "sensor.energy_consumption_tarif_2": {
      entity_id: "sensor.energy_consumption_tarif_2",
      state: "88.6",
      attributes: {
        last_reset: "1970-01-01T00:00:00:00+00",
        friendly_name: "Grid consumption high tariff",
        unit_of_measurement: "kWh",
      },
    },
    "sensor.energy_production_tarif_1": {
      entity_id: "sensor.energy_production_tarif_1",
      state: "88.6",
      attributes: {
        last_reset: "1970-01-01T00:00:00:00+00",
        friendly_name: "Returned to grid low tariff",
        unit_of_measurement: "kWh",
      },
    },
    "sensor.energy_production_tarif_2": {
      entity_id: "sensor.energy_production_tarif_2",
      state: "88.6",
      attributes: {
        last_reset: "1970-01-01T00:00:00:00+00",
        friendly_name: "Returned to grid high tariff",
        unit_of_measurement: "kWh",
      },
    },
    "sensor.energy_consumption_tarif_1_cost": {
      entity_id: "sensor.energy_consumption_tarif_1_cost",
      state: "2",
      attributes: {
        last_reset: "1970-01-01T00:00:00:00+00",
        unit_of_measurement: "EUR",
      },
    },
    "sensor.energy_consumption_tarif_2_cost": {
      entity_id: "sensor.energy_consumption_tarif_2_cost",
      state: "2",
      attributes: {
        last_reset: "1970-01-01T00:00:00:00+00",
        unit_of_measurement: "EUR",
      },
    },
    "sensor.energy_production_tarif_1_compensation": {
      entity_id: "sensor.energy_production_tarif_1_compensation",
      state: "2",
      attributes: {
        last_reset: "1970-01-01T00:00:00:00+00",
        unit_of_measurement: "EUR",
      },
    },
    "sensor.energy_production_tarif_2_compensation": {
      entity_id: "sensor.energy_production_tarif_2_compensation",
      state: "2",
      attributes: {
        last_reset: "1970-01-01T00:00:00:00+00",
        unit_of_measurement: "EUR",
      },
    },
    "sensor.energy_gas_cost": {
      entity_id: "sensor.energy_gas_cost",
      state: "2",
      attributes: {
        last_reset: "1970-01-01T00:00:00:00+00",
        unit_of_measurement: "EUR",
      },
    },
    "sensor.energy_gas": {
      entity_id: "sensor.energy_gas",
      state: "4",
      attributes: {
        last_reset: "1970-01-01T00:00:00:00+00",
        friendly_name: "Gas",
        unit_of_measurement: "m³",
      },
    },
    "sensor.energy_car": {
      entity_id: "sensor.energy_car",
      state: "4",
      attributes: {
        last_reset: "1970-01-01T00:00:00:00+00",
        friendly_name: "Electric car",
        unit_of_measurement: "kWh",
      },
    },
    "sensor.energy_ac": {
      entity_id: "sensor.energy_ac",
      state: "3",
      attributes: {
        last_reset: "1970-01-01T00:00:00:00+00",
        friendly_name: "Air conditioning",
        unit_of_measurement: "kWh",
      },
    },
    "sensor.energy_washing_machine": {
      entity_id: "sensor.energy_washing_machine",
      state: "6",
      attributes: {
        last_reset: "1970-01-01T00:00:00:00+00",
        friendly_name: "Washing machine",
        unit_of_measurement: "kWh",
      },
    },
    "sensor.energy_dryer": {
      entity_id: "sensor.energy_dryer",
      state: "5.5",
      attributes: {
        last_reset: "1970-01-01T00:00:00:00+00",
        friendly_name: "Dryer",
        unit_of_measurement: "kWh",
      },
    },
    "sensor.energy_heat_pump": {
      entity_id: "sensor.energy_heat_pump",
      state: "6",
      attributes: {
        last_reset: "1970-01-01T00:00:00:00+00",
        friendly_name: "Heat pump",
        unit_of_measurement: "kWh",
      },
    },
    "sensor.energy_boiler": {
      entity_id: "sensor.energy_boiler",
      state: "7",
      attributes: {
        last_reset: "1970-01-01T00:00:00:00+00",
        friendly_name: "Boiler",
        unit_of_measurement: "kWh",
      },
    },
  });
