export const mapEntities = () =>
  Object.values({
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
      entity_id: "sensor.energy_consumption_tarif_1",
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
    "sensor.energy_water": {
      entity_id: "sensor.energy_water",
      state: "4000",
      attributes: {
        last_reset: "1970-01-01T00:00:00:00+00",
        friendly_name: "Water",
        unit_of_measurement: "L",
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

// Entities behind the connectivity settings pages. The infrared and radio
// frequency pages are built from these entities alone; the Matter and Zigbee
// pages count them per config entry.
export const connectivityEntities = () =>
  Object.values({
    "light.office_bulb": {
      entity_id: "light.office_bulb",
      device_id: "matter-bulb",
      platform: "matter",
      state: "on",
      attributes: {
        friendly_name: "Office bulb",
        supported_color_modes: ["color_temp"],
        color_mode: "color_temp",
        color_temp_kelvin: 3000,
        brightness: 180,
      },
    },
    "switch.office_plug": {
      entity_id: "switch.office_plug",
      device_id: "matter-plug",
      platform: "matter",
      state: "on",
      attributes: {
        friendly_name: "Office plug",
        device_class: "outlet",
      },
    },
    "binary_sensor.hallway_motion": {
      entity_id: "binary_sensor.hallway_motion",
      device_id: "zha-motion",
      platform: "zha",
      state: "off",
      attributes: {
        friendly_name: "Hallway motion",
        device_class: "motion",
      },
    },
    "sensor.bedroom_remote_battery": {
      entity_id: "sensor.bedroom_remote_battery",
      device_id: "zha-remote",
      platform: "zha",
      state: "87",
      attributes: {
        friendly_name: "Bedroom remote battery",
        device_class: "battery",
        state_class: "measurement",
        unit_of_measurement: "%",
      },
    },
    "light.dining_room_dimmer": {
      entity_id: "light.dining_room_dimmer",
      device_id: "zwave-dimmer",
      platform: "zwave_js",
      state: "off",
      attributes: {
        friendly_name: "Dining room dimmer",
        supported_color_modes: ["brightness"],
        color_mode: null,
      },
    },
    "infrared.living_room_emitter": {
      entity_id: "infrared.living_room_emitter",
      device_id: "ir-blaster",
      platform: "broadlink",
      state: "2026-08-31T19:12:00+00:00",
      attributes: {
        friendly_name: "Living room IR blaster emitter",
        device_class: "emitter",
      },
    },
    "infrared.living_room_receiver": {
      entity_id: "infrared.living_room_receiver",
      device_id: "ir-blaster",
      platform: "broadlink",
      state: "2026-08-30T08:41:00+00:00",
      attributes: {
        friendly_name: "Living room IR blaster receiver",
        device_class: "receiver",
      },
    },
    "radio_frequency.rf_bridge": {
      entity_id: "radio_frequency.rf_bridge",
      device_id: "rf-bridge",
      platform: "mqtt",
      state: "2026-09-01T06:25:00+00:00",
      attributes: {
        friendly_name: "RF bridge transmitter",
      },
    },
  });
