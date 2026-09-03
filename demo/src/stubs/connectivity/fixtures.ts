import type { ConfigEntry } from "../../../../src/data/config_entries";
import type { DeviceRegistryEntry } from "../../../../src/data/device/device_registry";
import type { EntityRegistryEntry } from "../../../../src/data/entity/entity_registry";
import type { EntityInput } from "../../../../src/fake_data/entities/types";
import type { IntegrationType } from "../../../../src/data/integration";

// Shared fixtures for the connectivity integrations (Matter, Zigbee, Z-Wave,
// Thread, Bluetooth, MQTT, infrared and radio frequency). The registry data
// lives here because the device and entity registries are mocked eagerly, while
// the WebSocket mocks that build on it are code-split into the config panel
// chunk.

const baseEntry = {
  source: "user",
  state: "loaded" as const,
  supports_options: false,
  supports_remove_device: false,
  supports_unload: true,
  supports_reconfigure: true,
  supported_subentry_types: {},
  num_subentries: 0,
  pref_disable_new_entities: false,
  pref_disable_polling: false,
  disabled_by: null,
  reason: null,
  error_reason_translation_domain: null,
  error_reason_translation_key: null,
  error_reason_translation_placeholders: null,
};

export const MATTER_ENTRY_ID = "mock-matter";
export const ZHA_ENTRY_ID = "mock-zha";
export const ZWAVE_JS_ENTRY_ID = "mock-zwave-js";
export const BLUETOOTH_ENTRY_ID = "mock-bluetooth";
export const BLUETOOTH_PROXY_LIVING_ENTRY_ID = "mock-bluetooth-proxy-living";
export const BLUETOOTH_PROXY_SHED_ENTRY_ID = "mock-bluetooth-proxy-shed";
export const MQTT_ENTRY_ID = "mock-mqtt";
export const THREAD_ENTRY_ID = "mock-thread";
export const OTBR_ENTRY_ID = "mock-otbr";
export const BROADLINK_ENTRY_ID = "mock-broadlink";

export const connectivityConfigEntries: {
  entry: ConfigEntry;
  type: IntegrationType;
}[] = [
  {
    type: "hub",
    entry: {
      ...baseEntry,
      entry_id: MATTER_ENTRY_ID,
      domain: "matter",
      title: "Matter",
      supports_remove_device: true,
    },
  },
  {
    type: "hub",
    entry: {
      ...baseEntry,
      entry_id: ZHA_ENTRY_ID,
      domain: "zha",
      title: "Home Assistant Connect ZBT-1",
      supports_options: true,
      supports_remove_device: true,
    },
  },
  {
    type: "hub",
    entry: {
      ...baseEntry,
      entry_id: ZWAVE_JS_ENTRY_ID,
      domain: "zwave_js",
      title: "Z-Wave",
      supports_options: true,
      supports_remove_device: true,
    },
  },
  {
    type: "hub",
    entry: {
      ...baseEntry,
      entry_id: BLUETOOTH_ENTRY_ID,
      domain: "bluetooth",
      title: "hci0 (00:1A:7D:DA:71:11)",
      source: "usb",
      supports_options: true,
    },
  },
  {
    type: "hub",
    entry: {
      ...baseEntry,
      entry_id: BLUETOOTH_PROXY_LIVING_ENTRY_ID,
      domain: "bluetooth",
      title: "Living room proxy",
      source: "esphome",
    },
  },
  {
    type: "hub",
    entry: {
      ...baseEntry,
      entry_id: BLUETOOTH_PROXY_SHED_ENTRY_ID,
      domain: "bluetooth",
      title: "Shed proxy",
      source: "esphome",
    },
  },
  {
    type: "hub",
    entry: {
      ...baseEntry,
      entry_id: MQTT_ENTRY_ID,
      domain: "mqtt",
      title: "core-mosquitto",
      supports_options: true,
      supports_remove_device: true,
    },
  },
  {
    type: "service",
    entry: {
      ...baseEntry,
      entry_id: THREAD_ENTRY_ID,
      domain: "thread",
      title: "Thread",
    },
  },
  {
    type: "service",
    entry: {
      ...baseEntry,
      entry_id: OTBR_ENTRY_ID,
      domain: "otbr",
      title: "Open Thread Border Router",
    },
  },
  {
    type: "hub",
    entry: {
      ...baseEntry,
      entry_id: BROADLINK_ENTRY_ID,
      domain: "broadlink",
      title: "RM4 pro",
    },
  },
];

const baseDevice = {
  config_entries_subentries: {},
  connections: [] as [string, string][],
  identifiers: [] as [string, string][],
  model_id: null,
  labels: [] as string[],
  sw_version: null,
  hw_version: null,
  serial_number: null,
  via_device_id: null,
  area_id: null,
  name_by_user: null,
  disabled_by: null,
  configuration_url: null,
  parent_device_id: null,
  entry_type: null,
  created_at: 0,
  modified_at: 0,
};

const device = (
  id: string,
  name: string,
  manufacturer: string,
  model: string,
  entryId: string,
  extra: Partial<DeviceRegistryEntry> = {}
): DeviceRegistryEntry => ({
  ...baseDevice,
  id,
  name,
  manufacturer,
  model,
  config_entries: [entryId],
  primary_config_entry: entryId,
  ...extra,
});

export const MATTER_DEVICES = [
  device(
    "matter-kitchen-light",
    "Kitchen ceiling",
    "Nanoleaf",
    "Essentials A19",
    MATTER_ENTRY_ID,
    { area_id: "kitchen", sw_version: "3.5.7" }
  ),
  device(
    "matter-front-door-lock",
    "Front door lock",
    "Aqara",
    "Smart Lock U100",
    MATTER_ENTRY_ID,
    { sw_version: "1.2.0" }
  ),
  device(
    "matter-office-plug",
    "Office plug",
    "Eve",
    "Energy",
    MATTER_ENTRY_ID,
    { area_id: "office", sw_version: "3.2.0" }
  ),
  device(
    "matter-garden-sensor",
    "Garden sensor",
    "Eve",
    "Weather",
    MATTER_ENTRY_ID,
    { area_id: "garden", sw_version: "3.2.1" }
  ),
];

export const ZHA_DEVICES = [
  device(
    "zha-coordinator",
    "Home Assistant Connect ZBT-1",
    "Nabu Casa",
    "Connect ZBT-1",
    ZHA_ENTRY_ID,
    {
      sw_version: "7.4.4.0",
      identifiers: [["zha", "00:12:4b:00:24:c2:e1:00"]],
    }
  ),
  device(
    "zha-porch-light",
    "Porch light",
    "IKEA of Sweden",
    "TRADFRI bulb E27 CWS 806lm",
    ZHA_ENTRY_ID,
    { identifiers: [["zha", "84:2e:14:ff:fe:11:22:33"]] }
  ),
  device(
    "zha-hall-motion",
    "Hall motion",
    "IKEA of Sweden",
    "TRADFRI motion sensor",
    ZHA_ENTRY_ID,
    { identifiers: [["zha", "cc:cc:cc:ff:fe:44:55:66"]] }
  ),
  device("zha-tv-plug", "TV plug", "Innr", "SP 220", ZHA_ENTRY_ID, {
    area_id: "living_room",
    identifiers: [["zha", "00:15:8d:00:03:aa:bb:cc"]],
  }),
  device(
    "zha-kitchen-switch",
    "Kitchen switch",
    "IKEA of Sweden",
    "TRADFRI on/off switch",
    ZHA_ENTRY_ID,
    {
      area_id: "kitchen",
      identifiers: [["zha", "84:2e:14:ff:fe:aa:bb:01"]],
    }
  ),
  device(
    "zha-bedroom-sensor",
    "Bedroom sensor",
    "Aqara",
    "WSDCGQ11LM",
    ZHA_ENTRY_ID,
    {
      area_id: "bedroom",
      identifiers: [["zha", "00:15:8d:00:03:aa:bb:02"]],
    }
  ),
  device(
    "zha-garage-contact",
    "Garage contact",
    "Aqara",
    "MCCGQ11LM",
    ZHA_ENTRY_ID,
    { identifiers: [["zha", "00:15:8d:00:03:aa:bb:03"]] }
  ),
  device("zha-office-plug", "Office plug", "Innr", "SP 240", ZHA_ENTRY_ID, {
    area_id: "office",
    identifiers: [["zha", "00:15:8d:00:03:aa:bb:04"]],
  }),
];

export const ZWAVE_DEVICES = [
  device(
    "zwave-controller",
    "Z-Wave stick",
    "Zooz",
    "800 Series Z-Wave Long Range",
    ZWAVE_JS_ENTRY_ID,
    { sw_version: "1.10", identifiers: [["zwave_js", "3245146787-1"]] }
  ),
  device(
    "zwave-dining-dimmer",
    "Dining room dimmer",
    "Inovelli",
    "LZW31-SN",
    ZWAVE_JS_ENTRY_ID,
    { identifiers: [["zwave_js", "3245146787-12"]] }
  ),
  device(
    "zwave-back-door-lock",
    "Back door lock",
    "Yale",
    "YRD226",
    ZWAVE_JS_ENTRY_ID,
    { identifiers: [["zwave_js", "3245146787-18"]] }
  ),
  device(
    "zwave-basement-sensor",
    "Basement sensor",
    "Aeotec",
    "ZWA005 TriSensor",
    ZWAVE_JS_ENTRY_ID,
    { identifiers: [["zwave_js", "3245146787-23"]] }
  ),
  device(
    "zwave-hallway-switch",
    "Hallway switch",
    "Zooz",
    "ZEN76",
    ZWAVE_JS_ENTRY_ID,
    { area_id: "entrance", identifiers: [["zwave_js", "3245146787-7"]] }
  ),
  device(
    "zwave-kitchen-motion",
    "Kitchen motion",
    "Aeotec",
    "MultiSensor 7",
    ZWAVE_JS_ENTRY_ID,
    { area_id: "kitchen", identifiers: [["zwave_js", "3245146787-15"]] }
  ),
  device(
    "zwave-bedroom-thermostat",
    "Bedroom thermostat",
    "Honeywell",
    "T6 Pro",
    ZWAVE_JS_ENTRY_ID,
    { area_id: "bedroom", identifiers: [["zwave_js", "3245146787-20"]] }
  ),
  device(
    "zwave-porch-outlet",
    "Porch outlet",
    "Zooz",
    "ZEN15",
    ZWAVE_JS_ENTRY_ID,
    { identifiers: [["zwave_js", "3245146787-31"]] }
  ),
];

// Adapters and proxies are matched to their scanner by the bluetooth
// connection tuple, see ./bluetooth.
export const BLUETOOTH_DEVICES = [
  device(
    "bluetooth-hci0",
    "hci0",
    "Home Assistant",
    "Home Assistant Green",
    BLUETOOTH_ENTRY_ID,
    { connections: [["bluetooth", "00:1A:7D:DA:71:11"]] }
  ),
  device(
    "bluetooth-proxy-living",
    "Living room proxy",
    "Espressif",
    "ESP32-C3",
    BLUETOOTH_PROXY_LIVING_ENTRY_ID,
    {
      area_id: "living_room",
      connections: [["bluetooth", "E8:DB:84:A1:C2:30"]],
    }
  ),
  device(
    "bluetooth-proxy-shed",
    "Shed proxy",
    "Espressif",
    "ESP32",
    BLUETOOTH_PROXY_SHED_ENTRY_ID,
    { connections: [["bluetooth", "A4:CF:12:9B:44:70"]] }
  ),
];

export const MQTT_DEVICES = [
  device(
    "mqtt-kitchen-sensor",
    "Kitchen sensor",
    "Xiaomi",
    "LYWSD03MMC",
    MQTT_ENTRY_ID,
    { area_id: "kitchen" }
  ),
  device(
    "mqtt-garage-door",
    "Garage door",
    "Shelly",
    "Shelly Plus 1",
    MQTT_ENTRY_ID
  ),
];

export const IR_RF_DEVICES = [
  device(
    "broadlink-living-room",
    "Living room blaster",
    "Broadlink",
    "RM4 pro",
    BROADLINK_ENTRY_ID,
    { area_id: "living_room" }
  ),
  device(
    "broadlink-bedroom",
    "Bedroom blaster",
    "Broadlink",
    "RM mini 3",
    BROADLINK_ENTRY_ID,
    { area_id: "bedroom" }
  ),
];

export const connectivityDevices: DeviceRegistryEntry[] = [
  ...BLUETOOTH_DEVICES,
  ...MQTT_DEVICES,
  ...MATTER_DEVICES,
  ...ZHA_DEVICES,
  ...ZWAVE_DEVICES,
  ...IR_RF_DEVICES,
];

const baseRegistryEntry = {
  config_subentry_id: null,
  area_id: null,
  disabled_by: null,
  name: null,
  icon: null,
  labels: [] as string[],
  categories: {},
  hidden_by: null,
  entity_category: null,
  has_entity_name: true,
  options: null,
  created_at: 0,
  modified_at: 0,
};

const registryEntry = (
  entityId: string,
  deviceId: string,
  entryId: string,
  platform: string,
  name?: string
): EntityRegistryEntry => ({
  ...baseRegistryEntry,
  entity_id: entityId,
  id: entityId,
  unique_id: entityId,
  device_id: deviceId,
  config_entry_id: entryId,
  platform,
  name: name ?? null,
  has_entity_name: name === undefined,
});

export const connectivityEntityRegistryEntries: EntityRegistryEntry[] = [
  registryEntry(
    "light.kitchen_ceiling",
    "matter-kitchen-light",
    MATTER_ENTRY_ID,
    "matter"
  ),
  registryEntry(
    "lock.front_door",
    "matter-front-door-lock",
    MATTER_ENTRY_ID,
    "matter"
  ),
  registryEntry(
    "switch.office_plug",
    "matter-office-plug",
    MATTER_ENTRY_ID,
    "matter"
  ),
  registryEntry(
    "sensor.office_plug_power",
    "matter-office-plug",
    MATTER_ENTRY_ID,
    "matter"
  ),
  registryEntry(
    "sensor.garden_temperature",
    "matter-garden-sensor",
    MATTER_ENTRY_ID,
    "matter"
  ),
  registryEntry(
    "sensor.kitchen_temperature",
    "mqtt-kitchen-sensor",
    MQTT_ENTRY_ID,
    "mqtt"
  ),
  registryEntry(
    "sensor.kitchen_battery",
    "mqtt-kitchen-sensor",
    MQTT_ENTRY_ID,
    "mqtt"
  ),
  registryEntry("cover.garage_door", "mqtt-garage-door", MQTT_ENTRY_ID, "mqtt"),
  registryEntry("light.porch", "zha-porch-light", ZHA_ENTRY_ID, "zha"),
  registryEntry(
    "binary_sensor.hall_motion",
    "zha-hall-motion",
    ZHA_ENTRY_ID,
    "zha"
  ),
  registryEntry("switch.tv_plug", "zha-tv-plug", ZHA_ENTRY_ID, "zha"),
  registryEntry(
    "sensor.kitchen_switch_battery",
    "zha-kitchen-switch",
    ZHA_ENTRY_ID,
    "zha"
  ),
  registryEntry(
    "sensor.bedroom_temperature",
    "zha-bedroom-sensor",
    ZHA_ENTRY_ID,
    "zha"
  ),
  registryEntry(
    "binary_sensor.garage_contact",
    "zha-garage-contact",
    ZHA_ENTRY_ID,
    "zha"
  ),
  registryEntry("switch.office_desk", "zha-office-plug", ZHA_ENTRY_ID, "zha"),
  registryEntry(
    "light.dining_room",
    "zwave-dining-dimmer",
    ZWAVE_JS_ENTRY_ID,
    "zwave_js"
  ),
  registryEntry(
    "lock.back_door",
    "zwave-back-door-lock",
    ZWAVE_JS_ENTRY_ID,
    "zwave_js"
  ),
  registryEntry(
    "sensor.basement_humidity",
    "zwave-basement-sensor",
    ZWAVE_JS_ENTRY_ID,
    "zwave_js"
  ),
  registryEntry(
    "light.hallway",
    "zwave-hallway-switch",
    ZWAVE_JS_ENTRY_ID,
    "zwave_js"
  ),
  registryEntry(
    "binary_sensor.kitchen_motion",
    "zwave-kitchen-motion",
    ZWAVE_JS_ENTRY_ID,
    "zwave_js"
  ),
  registryEntry(
    "climate.bedroom",
    "zwave-bedroom-thermostat",
    ZWAVE_JS_ENTRY_ID,
    "zwave_js"
  ),
  registryEntry(
    "switch.porch_outlet",
    "zwave-porch-outlet",
    ZWAVE_JS_ENTRY_ID,
    "zwave_js"
  ),
  // The infrared and radio frequency panels are entity driven: the proxy
  // entities live in those domains while the registry platform stays the
  // integration that provides them.
  registryEntry(
    "infrared.living_room_blaster_emitter",
    "broadlink-living-room",
    BROADLINK_ENTRY_ID,
    "broadlink",
    "Emitter"
  ),
  registryEntry(
    "infrared.living_room_blaster_receiver",
    "broadlink-living-room",
    BROADLINK_ENTRY_ID,
    "broadlink",
    "Receiver"
  ),
  registryEntry(
    "infrared.bedroom_blaster_emitter",
    "broadlink-bedroom",
    BROADLINK_ENTRY_ID,
    "broadlink",
    "Emitter"
  ),
  registryEntry(
    "radio_frequency.living_room_blaster",
    "broadlink-living-room",
    BROADLINK_ENTRY_ID,
    "broadlink",
    "Radio frequency"
  ),
  registryEntry(
    "radio_frequency.bedroom_blaster",
    "broadlink-bedroom",
    BROADLINK_ENTRY_ID,
    "broadlink",
    "Radio frequency"
  ),
];

const minutesAgo = (minutes: number) =>
  new Date(Date.now() - minutes * 60000).toISOString();

// The demo's `addEntities` builds the display entity registry from the entity
// inputs, so mirror the device and platform of the matching registry entry onto
// each state. Panels count entities per device or per integration.
const withRegistryLinks = (
  states: Record<string, EntityInput>
): EntityInput[] =>
  Object.values(states).map((state) => {
    const entry = connectivityEntityRegistryEntries.find(
      (candidate) => candidate.entity_id === state.entity_id
    );
    return entry
      ? { ...state, device_id: entry.device_id!, platform: entry.platform }
      : state;
  });

export const connectivityEntities = (): EntityInput[] =>
  withRegistryLinks({
    "light.kitchen_ceiling": {
      entity_id: "light.kitchen_ceiling",
      state: "on",
      attributes: {
        friendly_name: "Kitchen ceiling",
        supported_color_modes: ["color_temp"],
        color_mode: "color_temp",
        brightness: 204,
      },
    },
    "lock.front_door": {
      entity_id: "lock.front_door",
      state: "locked",
      attributes: { friendly_name: "Front door lock" },
    },
    "switch.office_plug": {
      entity_id: "switch.office_plug",
      state: "on",
      attributes: { friendly_name: "Office plug" },
    },
    "sensor.office_plug_power": {
      entity_id: "sensor.office_plug_power",
      state: "42.5",
      attributes: {
        friendly_name: "Office plug power",
        device_class: "power",
        state_class: "measurement",
        unit_of_measurement: "W",
      },
    },
    "sensor.garden_temperature": {
      entity_id: "sensor.garden_temperature",
      state: "14.2",
      attributes: {
        friendly_name: "Garden temperature",
        device_class: "temperature",
        state_class: "measurement",
        unit_of_measurement: "°C",
      },
    },
    "sensor.kitchen_temperature": {
      entity_id: "sensor.kitchen_temperature",
      state: "21.4",
      attributes: {
        friendly_name: "Kitchen temperature",
        device_class: "temperature",
        state_class: "measurement",
        unit_of_measurement: "°C",
      },
    },
    "sensor.kitchen_battery": {
      entity_id: "sensor.kitchen_battery",
      state: "92",
      attributes: {
        friendly_name: "Kitchen battery",
        device_class: "battery",
        state_class: "measurement",
        unit_of_measurement: "%",
      },
    },
    "cover.garage_door": {
      entity_id: "cover.garage_door",
      state: "closed",
      attributes: { friendly_name: "Garage door", device_class: "garage" },
    },
    "light.porch": {
      entity_id: "light.porch",
      state: "off",
      attributes: {
        friendly_name: "Porch light",
        supported_color_modes: ["hs"],
      },
    },
    "binary_sensor.hall_motion": {
      entity_id: "binary_sensor.hall_motion",
      state: "off",
      attributes: { friendly_name: "Hall motion", device_class: "motion" },
    },
    "switch.tv_plug": {
      entity_id: "switch.tv_plug",
      state: "on",
      attributes: { friendly_name: "TV plug" },
    },
    "sensor.kitchen_switch_battery": {
      entity_id: "sensor.kitchen_switch_battery",
      state: "78",
      attributes: {
        friendly_name: "Kitchen switch battery",
        device_class: "battery",
        state_class: "measurement",
        unit_of_measurement: "%",
      },
    },
    "sensor.bedroom_temperature": {
      entity_id: "sensor.bedroom_temperature",
      state: "19.6",
      attributes: {
        friendly_name: "Bedroom temperature",
        device_class: "temperature",
        state_class: "measurement",
        unit_of_measurement: "°C",
      },
    },
    "binary_sensor.garage_contact": {
      entity_id: "binary_sensor.garage_contact",
      state: "off",
      attributes: { friendly_name: "Garage contact", device_class: "door" },
    },
    "switch.office_desk": {
      entity_id: "switch.office_desk",
      state: "on",
      attributes: { friendly_name: "Office desk" },
    },
    "light.dining_room": {
      entity_id: "light.dining_room",
      state: "on",
      attributes: {
        friendly_name: "Dining room dimmer",
        supported_color_modes: ["brightness"],
        color_mode: "brightness",
        brightness: 128,
      },
    },
    "lock.back_door": {
      entity_id: "lock.back_door",
      state: "unlocked",
      attributes: { friendly_name: "Back door lock" },
    },
    "sensor.basement_humidity": {
      entity_id: "sensor.basement_humidity",
      state: "58",
      attributes: {
        friendly_name: "Basement humidity",
        device_class: "humidity",
        state_class: "measurement",
        unit_of_measurement: "%",
      },
    },
    "light.hallway": {
      entity_id: "light.hallway",
      state: "off",
      attributes: {
        friendly_name: "Hallway switch",
        supported_color_modes: ["onoff"],
      },
    },
    "binary_sensor.kitchen_motion": {
      entity_id: "binary_sensor.kitchen_motion",
      state: "on",
      attributes: { friendly_name: "Kitchen motion", device_class: "motion" },
    },
    "climate.bedroom": {
      entity_id: "climate.bedroom",
      state: "heat",
      attributes: {
        friendly_name: "Bedroom thermostat",
        hvac_modes: ["off", "heat"],
        current_temperature: 19.6,
        temperature: 20.5,
        min_temp: 7,
        max_temp: 30,
        supported_features: 1,
      },
    },
    "switch.porch_outlet": {
      entity_id: "switch.porch_outlet",
      state: "off",
      attributes: { friendly_name: "Porch outlet" },
    },
    // Infrared and radio frequency proxy entities report the timestamp they
    // were last used as their state.
    "infrared.living_room_blaster_emitter": {
      entity_id: "infrared.living_room_blaster_emitter",
      state: minutesAgo(12),
      attributes: {
        friendly_name: "Living room blaster Emitter",
        device_class: "emitter",
      },
    },
    "infrared.living_room_blaster_receiver": {
      entity_id: "infrared.living_room_blaster_receiver",
      state: minutesAgo(3),
      attributes: {
        friendly_name: "Living room blaster Receiver",
        device_class: "receiver",
      },
    },
    "infrared.bedroom_blaster_emitter": {
      entity_id: "infrared.bedroom_blaster_emitter",
      state: minutesAgo(1440),
      attributes: {
        friendly_name: "Bedroom blaster Emitter",
        device_class: "emitter",
      },
    },
    "radio_frequency.living_room_blaster": {
      entity_id: "radio_frequency.living_room_blaster",
      state: minutesAgo(47),
      attributes: { friendly_name: "Living room blaster Radio frequency" },
    },
    "radio_frequency.bedroom_blaster": {
      entity_id: "radio_frequency.bedroom_blaster",
      state: "unknown",
      attributes: { friendly_name: "Bedroom blaster Radio frequency" },
    },
  } satisfies Record<string, EntityInput>);
