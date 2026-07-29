import type { DemoArea } from "../../stubs/area_registry";
import type { DemoFloor } from "../../stubs/floor_registry";

export const demoFloorsHome: DemoFloor[] = [
  {
    floor_id: "ground",
    name: "Ground floor",
    level: 0,
  },
  {
    floor_id: "upstairs",
    name: "Upstairs",
    level: 1,
  },
];

export const demoAreasHome: DemoArea[] = [
  {
    area_id: "living_room",
    name: "Living room",
    floor_id: "ground",
    icon: "mdi:sofa",
    temperature_entity_id: "sensor.living_room_temperature",
    humidity_entity_id: "sensor.living_room_humidity",
  },
  {
    area_id: "kitchen",
    name: "Kitchen",
    floor_id: "ground",
    icon: "mdi:fridge",
    temperature_entity_id: "sensor.kitchen_temperature",
    humidity_entity_id: "sensor.kitchen_humidity",
  },
  {
    area_id: "entrance",
    name: "Entrance",
    floor_id: "ground",
    icon: "mdi:door",
  },
  {
    area_id: "bedroom",
    name: "Bedroom",
    floor_id: "upstairs",
    icon: "mdi:bed",
    temperature_entity_id: "sensor.bedroom_temperature",
    humidity_entity_id: "sensor.bedroom_humidity",
  },
  {
    area_id: "office",
    name: "Office",
    floor_id: "upstairs",
    icon: "mdi:desk",
    temperature_entity_id: "sensor.office_temperature",
    humidity_entity_id: "sensor.office_humidity",
  },
  {
    area_id: "garden",
    name: "Garden",
    icon: "mdi:tree",
    temperature_entity_id: "sensor.garden_temperature",
    humidity_entity_id: "sensor.garden_humidity",
  },
];
