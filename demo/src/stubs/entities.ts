// Live power of the battery measured per direction, in W
const powerwallPower = {
  from_grid: 50,
  from_solar: 150,
  to_home: 0,
  to_grid: 0,
};

const powerEntity = (entityId: string, power: number) => ({
  entity_id: entityId,
  state: String(power),
  attributes: {
    state_class: "measurement",
    unit_of_measurement: "W",
  },
});

const powerwallEnergyEntity = (entityId: string, friendlyName: string) => ({
  entity_id: entityId,
  state: "2",
  attributes: {
    last_reset: "1970-01-01T00:00:00:00+00",
    friendly_name: friendlyName,
    unit_of_measurement: "kWh",
  },
});

export const energyEntities = () =>
  Object.values({
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
        state_class: "total_increasing",
        friendly_name: "Solar",
        unit_of_measurement: "kWh",
      },
    },
    "sensor.battery_input": {
      entity_id: "sensor.battery_input",
      state: "4",
      attributes: {
        state_class: "total_increasing",
        friendly_name: "Battery Input",
        unit_of_measurement: "kWh",
      },
    },
    "sensor.battery_output": {
      entity_id: "sensor.battery_output",
      state: "3",
      attributes: {
        state_class: "total_increasing",
        friendly_name: "Battery Output",
        unit_of_measurement: "kWh",
      },
    },
    "sensor.powerwall_from_grid": powerwallEnergyEntity(
      "sensor.powerwall_from_grid",
      "Powerwall charged from grid"
    ),
    "sensor.powerwall_from_solar": powerwallEnergyEntity(
      "sensor.powerwall_from_solar",
      "Powerwall charged from solar"
    ),
    "sensor.powerwall_to_home": powerwallEnergyEntity(
      "sensor.powerwall_to_home",
      "Powerwall discharged to home"
    ),
    "sensor.powerwall_to_grid": powerwallEnergyEntity(
      "sensor.powerwall_to_grid",
      "Powerwall discharged to grid"
    ),
    "sensor.powerwall_battery_level": {
      entity_id: "sensor.powerwall_battery_level",
      state: "62",
      attributes: {
        device_class: "battery",
        friendly_name: "Powerwall battery level",
        unit_of_measurement: "%",
      },
    },
    "sensor.energy_consumption_tarif_1": {
      entity_id: "sensor.energy_consumption_tarif_1",
      state: "88.6",
      attributes: {
        state_class: "total_increasing",
        friendly_name: "Grid consumption low tariff",
        unit_of_measurement: "kWh",
      },
    },
    "sensor.energy_consumption_tarif_2": {
      entity_id: "sensor.energy_consumption_tarif_2",
      state: "88.6",
      attributes: {
        state_class: "total_increasing",
        friendly_name: "Grid consumption high tariff",
        unit_of_measurement: "kWh",
      },
    },
    "sensor.energy_production_tarif_1": {
      entity_id: "sensor.energy_production_tarif_1",
      state: "88.6",
      attributes: {
        state_class: "total_increasing",
        friendly_name: "Returned to grid low tariff",
        unit_of_measurement: "kWh",
      },
    },
    "sensor.energy_production_tarif_2": {
      entity_id: "sensor.energy_production_tarif_2",
      state: "88.6",
      attributes: {
        state_class: "total_increasing",
        friendly_name: "Returned to grid high tariff",
        unit_of_measurement: "kWh",
      },
    },
    "sensor.energy_consumption_tarif_1_cost": {
      entity_id: "sensor.energy_consumption_tarif_1_cost",
      state: "2",
      attributes: {
        state_class: "total_increasing",
        unit_of_measurement: "EUR",
      },
    },
    "sensor.energy_consumption_tarif_2_cost": {
      entity_id: "sensor.energy_consumption_tarif_2_cost",
      state: "2",
      attributes: {
        state_class: "total_increasing",
        unit_of_measurement: "EUR",
      },
    },
    "sensor.energy_production_tarif_1_compensation": {
      entity_id: "sensor.energy_production_tarif_1_compensation",
      state: "2",
      attributes: {
        state_class: "total_increasing",
        unit_of_measurement: "EUR",
      },
    },
    "sensor.energy_production_tarif_2_compensation": {
      entity_id: "sensor.energy_production_tarif_2_compensation",
      state: "2",
      attributes: {
        state_class: "total_increasing",
        unit_of_measurement: "EUR",
      },
    },
    "sensor.power_grid": {
      entity_id: "sensor.power_grid",
      state: "500",
      attributes: {
        state_class: "measurement",
        unit_of_measurement: "W",
      },
    },
    "sensor.power_grid_return": {
      entity_id: "sensor.power_grid_return",
      state: "-100",
      attributes: {
        state_class: "measurement",
        unit_of_measurement: "W",
      },
    },
    "sensor.power_solar": {
      entity_id: "sensor.power_solar",
      state: "200",
      attributes: {
        state_class: "measurement",
        unit_of_measurement: "W",
      },
    },
    "sensor.power_battery": {
      entity_id: "sensor.power_battery",
      state: "100",
      attributes: {
        state_class: "measurement",
        unit_of_measurement: "W",
      },
    },
    "sensor.powerwall_power_from_grid": powerEntity(
      "sensor.powerwall_power_from_grid",
      powerwallPower.from_grid
    ),
    "sensor.powerwall_power_from_solar": powerEntity(
      "sensor.powerwall_power_from_solar",
      powerwallPower.from_solar
    ),
    "sensor.powerwall_power_to_home": powerEntity(
      "sensor.powerwall_power_to_home",
      powerwallPower.to_home
    ),
    "sensor.powerwall_power_to_grid": powerEntity(
      "sensor.powerwall_power_to_grid",
      powerwallPower.to_grid
    ),
    "sensor.powerwall_power": powerEntity(
      "sensor.powerwall_power",
      powerwallPower.to_home +
        powerwallPower.to_grid -
        powerwallPower.from_grid -
        powerwallPower.from_solar
    ),
    "sensor.energy_gas_cost": {
      entity_id: "sensor.energy_gas_cost",
      state: "2",
      attributes: {
        state_class: "total_increasing",
        unit_of_measurement: "EUR",
      },
    },
    "sensor.energy_gas": {
      entity_id: "sensor.energy_gas",
      state: "4",
      attributes: {
        state_class: "total_increasing",
        friendly_name: "Gas",
        unit_of_measurement: "m³",
      },
    },
    "sensor.energy_water": {
      entity_id: "sensor.energy_water",
      state: "4000",
      attributes: {
        state_class: "total_increasing",
        friendly_name: "Water",
        unit_of_measurement: "L",
      },
    },
    "sensor.gas_kitchen": {
      entity_id: "sensor.gas_kitchen",
      state: "100",
      attributes: {
        friendly_name: "Gas kitchen",
        unit_of_measurement: "m³",
        device_class: "gas",
        state_class: "total_increasing",
      },
    },
    "sensor.gas_heat_pump": {
      entity_id: "sensor.gas_heat_pump",
      state: "500",
      attributes: {
        friendly_name: "Gas heat pump",
        unit_of_measurement: "m³",
        device_class: "gas",
        state_class: "total_increasing",
      },
    },
    "sensor.energy_car": {
      entity_id: "sensor.energy_car",
      state: "4",
      attributes: {
        state_class: "total_increasing",
        friendly_name: "Electric car",
        unit_of_measurement: "kWh",
      },
    },
    "sensor.energy_ac": {
      entity_id: "sensor.energy_ac",
      state: "3",
      attributes: {
        state_class: "total_increasing",
        friendly_name: "Air conditioning",
        unit_of_measurement: "kWh",
      },
    },
    "sensor.energy_washing_machine": {
      entity_id: "sensor.energy_washing_machine",
      state: "6",
      attributes: {
        state_class: "total_increasing",
        friendly_name: "Washing machine",
        unit_of_measurement: "kWh",
      },
    },
    "sensor.energy_dryer": {
      entity_id: "sensor.energy_dryer",
      state: "5.5",
      attributes: {
        state_class: "total_increasing",
        friendly_name: "Dryer",
        unit_of_measurement: "kWh",
      },
    },
    "sensor.energy_heat_pump": {
      entity_id: "sensor.energy_heat_pump",
      state: "6",
      attributes: {
        state_class: "total_increasing",
        friendly_name: "Heat pump",
        unit_of_measurement: "kWh",
      },
    },
    "sensor.energy_boiler": {
      entity_id: "sensor.energy_boiler",
      state: "7",
      attributes: {
        state_class: "total_increasing",
        friendly_name: "Boiler",
        unit_of_measurement: "kWh",
      },
    },
    "sensor.power_car": {
      entity_id: "sensor.power_car",
      state: "40",
      attributes: {
        state_class: "measurement",
        friendly_name: "Electric car",
        unit_of_measurement: "W",
      },
    },
    "sensor.power_ac": {
      entity_id: "sensor.power_ac",
      state: "30",
      attributes: {
        state_class: "measurement",
        friendly_name: "Air conditioning",
        unit_of_measurement: "W",
      },
    },
    "sensor.power_washing_machine": {
      entity_id: "sensor.power_washing_machine",
      state: "60",
      attributes: {
        state_class: "measurement",
        friendly_name: "Washing machine",
        unit_of_measurement: "W",
      },
    },
    "sensor.power_dryer": {
      entity_id: "sensor.power_dryer",
      state: "55",
      attributes: {
        state_class: "measurement",
        friendly_name: "Dryer",
        unit_of_measurement: "W",
      },
    },
    "sensor.power_heat_pump": {
      entity_id: "sensor.power_heat_pump",
      state: "60",
      attributes: {
        state_class: "measurement",
        friendly_name: "Heat pump",
        unit_of_measurement: "W",
      },
    },
    "sensor.power_boiler": {
      entity_id: "sensor.power_boiler",
      state: "70",
      attributes: {
        state_class: "measurement",
        friendly_name: "Boiler",
        unit_of_measurement: "W",
      },
    },
  });
